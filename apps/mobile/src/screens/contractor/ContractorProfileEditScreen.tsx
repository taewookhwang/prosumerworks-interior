import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { contractorService, UpdateContractorProfileDto } from '../../services/contractor';
import { useAuthStore } from '../../store/auth';
import { authService } from '../../services/auth';

export const ContractorProfileEditScreen = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [career, setCareer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: contractor, isLoading } = useQuery({
    queryKey: ['myContractor'],
    queryFn: contractorService.getMyContractor,
  });

  useEffect(() => {
    if (contractor) {
      setProfileImage(contractor.profileImage || null);
      setDescription(contractor.description || '');
      setCareer(contractor.career || '');
    }
  }, [contractor]);

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateContractorProfileDto) => contractorService.updateMyProfile(dto),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['myContractor'] });
      // Refresh user data to update store
      const updatedUser = await authService.getMe();
      setUser(updatedUser);
      Alert.alert('완료', '업체 프로필이 업데이트되었습니다.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('오류', error.response?.data?.message || '프로필 업데이트에 실패했습니다.');
    },
  });

  const handlePickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
    });

    if (result.assets && result.assets[0]?.uri) {
      // For now, just set the local URI - in production, you would upload to a server
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const dto: UpdateContractorProfileDto = {
      description: description.trim() || undefined,
      career: career.trim() || undefined,
      profileImage: profileImage || undefined,
    };

    updateMutation.mutate(dto, {
      onSettled: () => setIsSubmitting(false),
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>업체 프로필 수정</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSubmitting}
            style={styles.saveButton}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#2196F3" />
            ) : (
              <Text style={styles.saveText}>저장</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.profileImageSection}>
            <TouchableOpacity onPress={handlePickImage} style={styles.imageContainer}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Ionicons name="business" size={40} color="#ccc" />
                </View>
              )}
              <View style={styles.cameraButton}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.imageHint}>업체 대표 이미지 또는 로고</Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.companyName}>{contractor?.companyName}</Text>
            <Text style={styles.companyStatus}>
              {contractor?.status === 'approved'
                ? '승인됨'
                : contractor?.status === 'pending'
                ? '승인 대기중'
                : '거절됨'}
            </Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>업체 소개</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="업체를 소개해주세요 (시공 스타일, 강점 등)"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Text style={styles.label}>경력 및 자격</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={career}
              onChangeText={setCareer}
              placeholder="경력, 자격증, 수상 이력 등을 입력해주세요"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.tipSection}>
            <Ionicons name="bulb-outline" size={20} color="#F57C00" />
            <Text style={styles.tipText}>
              상세한 업체 소개와 경력은 고객의 신뢰도를 높이고 견적 요청을 늘릴 수 있습니다.
            </Text>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  saveText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  profileImageSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  imageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  imageHint: {
    marginTop: 8,
    fontSize: 13,
    color: '#8e8e8e',
  },
  infoSection: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#f5f5f5',
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  companyStatus: {
    fontSize: 13,
    color: '#8e8e8e',
  },
  formSection: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#fafafa',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  tipSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF8E1',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    lineHeight: 18,
  },
  bottomSpacer: {
    height: 40,
  },
});
