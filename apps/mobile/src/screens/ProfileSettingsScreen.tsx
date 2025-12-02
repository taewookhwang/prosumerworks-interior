import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../store/auth';
import { authService } from '../services/auth';

export const ProfileSettingsScreen = () => {
  const navigation = useNavigation<any>();
  const { user, setUser, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const nameChanged = name !== (user?.name || '');
    const phoneChanged = phone !== (user?.phone || '');
    setHasChanges(nameChanged || phoneChanged);
  }, [name, phone, user]);

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      const updates: { name?: string; phone?: string } = {};
      if (name !== user?.name) updates.name = name.trim();
      if (phone !== (user?.phone || '')) updates.phone = phone.trim() || undefined;

      const updatedUser = await authService.updateProfile(updates);
      setUser(updatedUser);
      Alert.alert('저장 완료', '프로필이 업데이트되었습니다.');
      setHasChanges(false);
    } catch (error: any) {
      Alert.alert('오류', error.response?.data?.message || '저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '회원 탈퇴',
      '정말로 탈퇴하시겠습니까?\n\n탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴하기',
          style: 'destructive',
          onPress: () => confirmDeleteAccount(),
        },
      ],
    );
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      '최종 확인',
      '회원 탈퇴를 진행하시겠습니까?\n이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴 확인',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await authService.deleteAccount();
              await GoogleSignin.signOut();
              logout();
              Alert.alert('탈퇴 완료', '회원 탈퇴가 완료되었습니다.');
            } catch (error: any) {
              Alert.alert('오류', error.response?.data?.message || '탈퇴에 실패했습니다.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>처리 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#262626" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>프로필 설정</Text>
        <TouchableOpacity onPress={handleSave} disabled={!hasChanges || isSaving}>
          {isSaving ? (
            <ActivityIndicator size="small" color="#2196F3" />
          ) : (
            <Text style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}>
              저장
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기본 정보</Text>

          <Text style={styles.label}>이메일</Text>
          <View style={styles.readOnlyInput}>
            <Text style={styles.readOnlyText}>{user?.email}</Text>
          </View>
          <Text style={styles.helperText}>이메일은 변경할 수 없습니다</Text>

          <Text style={styles.label}>이름</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="이름을 입력하세요"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>전화번호</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="전화번호를 입력하세요"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정 관리</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>가입일</Text>
            <Text style={styles.infoValue}>
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('ko-KR')
                : '-'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>회원 유형</Text>
            <Text style={styles.infoValue}>
              {user?.userType === 'contractor' ? '업체 회원' : '일반 회원'}
            </Text>
          </View>
        </View>

        <View style={styles.dangerSection}>
          <Text style={styles.dangerTitle}>위험 구역</Text>
          <Text style={styles.dangerDescription}>
            회원 탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
          </Text>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Text style={styles.deleteButtonText}>회원 탈퇴</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
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
  saveButton: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  saveButtonDisabled: {
    color: '#ccc',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  readOnlyInput: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  readOnlyText: {
    fontSize: 16,
    color: '#999',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
  },
  dangerSection: {
    padding: 16,
    marginTop: 24,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E53935',
    marginBottom: 8,
  },
  dangerDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#E53935',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#E53935',
    fontWeight: '600',
  },
});
