import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../services/api';
import { useAuthStore } from '../store/auth';

const SPECIALTIES = [
  '전체 인테리어',
  '부분 인테리어',
  '주방',
  '욕실',
  '도배/장판',
  '페인트',
  '타일',
  '목공',
  '조명',
  '가구',
];

const SERVICE_AREAS = [
  '서울',
  '경기',
  '인천',
  '부산',
  '대구',
  '광주',
  '대전',
  '울산',
  '세종',
  '강원',
  '충북',
  '충남',
  '전북',
  '전남',
  '경북',
  '경남',
  '제주',
];

export const ContractorRegisterScreen = () => {
  const navigation = useNavigation();
  const { setUser, user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  const toggleSpecialty = (specialty: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(specialty)
        ? prev.filter((s) => s !== specialty)
        : [...prev, specialty],
    );
  };

  const toggleArea = (area: string) => {
    setSelectedAreas((prev) =>
      prev.includes(area)
        ? prev.filter((a) => a !== area)
        : [...prev, area],
    );
  };

  const formatBusinessNumber = (text: string) => {
    // Remove non-digits
    const digits = text.replace(/\D/g, '');
    // Format as XXX-XX-XXXXX
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 10)}`;
  };

  const handleBusinessNumberChange = (text: string) => {
    setBusinessNumber(formatBusinessNumber(text));
  };

  const handleSubmit = async () => {
    if (!companyName.trim()) {
      Alert.alert('알림', '업체명을 입력해주세요.');
      return;
    }
    if (!businessNumber.trim() || businessNumber.replace(/\D/g, '').length !== 10) {
      Alert.alert('알림', '사업자등록번호 10자리를 입력해주세요.');
      return;
    }
    if (selectedSpecialties.length === 0) {
      Alert.alert('알림', '시공 분야를 선택해주세요.');
      return;
    }
    if (selectedAreas.length === 0) {
      Alert.alert('알림', '서비스 지역을 선택해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/contractors/apply', {
        companyName: companyName.trim(),
        businessNumber: businessNumber.trim(),
        description: description.trim() || undefined,
        specialties: selectedSpecialties,
        serviceAreas: selectedAreas,
      });
      // 서버 응답의 업데이트된 유저 정보로 상태 변경
      if (response.data?.user) {
        setUser(response.data.user);
      }
      Alert.alert('신청 완료', '업체 등록이 완료되었습니다.\n이제 포트폴리오를 올릴 수 있습니다.', [
        {
          text: '확인',
          // userType이 contractor로 변경되면 RootNavigator가 자동으로 ContractorTabNavigator로 전환됨
        },
      ]);
    } catch (error: any) {
      Alert.alert('오류', error.response?.data?.message || '다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#262626" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>업체 등록</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>업체 정보</Text>

        <Text style={styles.label}>업체명 *</Text>
        <TextInput
          style={styles.input}
          value={companyName}
          onChangeText={setCompanyName}
          placeholder="업체명을 입력해주세요"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>사업자등록번호 *</Text>
        <TextInput
          style={styles.input}
          value={businessNumber}
          onChangeText={handleBusinessNumberChange}
          placeholder="000-00-00000"
          placeholderTextColor="#999"
          keyboardType="numeric"
          maxLength={12}
        />

        <Text style={styles.label}>업체 소개</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="업체를 소개해주세요 (선택)"
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={styles.sectionTitle}>시공 분야 *</Text>
        <Text style={styles.sectionSubtitle}>해당되는 분야를 모두 선택해주세요</Text>

        <View style={styles.categoriesContainer}>
          {SPECIALTIES.map((specialty) => (
            <TouchableOpacity
              key={specialty}
              style={[
                styles.categoryChip,
                selectedSpecialties.includes(specialty) && styles.categoryChipSelected,
              ]}
              onPress={() => toggleSpecialty(specialty)}>
              <Text
                style={[
                  styles.categoryChipText,
                  selectedSpecialties.includes(specialty) &&
                    styles.categoryChipTextSelected,
                ]}>
                {specialty}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>서비스 지역 *</Text>
        <Text style={styles.sectionSubtitle}>시공 가능한 지역을 선택해주세요</Text>

        <View style={styles.categoriesContainer}>
          {SERVICE_AREAS.map((area) => (
            <TouchableOpacity
              key={area}
              style={[
                styles.categoryChip,
                selectedAreas.includes(area) && styles.categoryChipSelected,
              ]}
              onPress={() => toggleArea(area)}>
              <Text
                style={[
                  styles.categoryChipText,
                  selectedAreas.includes(area) &&
                    styles.categoryChipTextSelected,
                ]}>
                {area}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>등록 신청하기</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryChipSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
  },
  categoryChipTextSelected: {
    color: '#2196F3',
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  submitButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#90CAF9',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
