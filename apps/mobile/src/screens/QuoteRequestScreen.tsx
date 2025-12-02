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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import type { RootStackParamList } from '../navigation/types';
import api from '../services/api';

type RouteProps = RouteProp<RootStackParamList, 'QuoteRequest'>;

const CATEGORIES = [
  '전체 인테리어',
  '부분 인테리어',
  '주방',
  '욕실',
  '도배/장판',
  '페인트',
  '타일',
  '목공',
];

const CITIES = ['서울', '경기', '인천', '부산', '대구', '대전', '광주', '제주'];

export const QuoteRequestScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { contractorId, portfolioId } = route.params;

  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [areaSize, setAreaSize] = useState('');
  const [description, setDescription] = useState('');
  const [preferredSchedule, setPreferredSchedule] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const createQuoteMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/quotes', {
        contractorId,
        portfolioId: portfolioId || undefined,
        category,
        locationCity: city,
        locationDistrict: district || undefined,
        areaSize: areaSize ? parseInt(areaSize, 10) : undefined,
        description,
        preferredSchedule: preferredSchedule || undefined,
        contactPhone,
      });
      return response.data;
    },
    onSuccess: () => {
      Alert.alert('견적 문의 완료', '업체에 견적 문의가 전송되었습니다.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error: any) => {
      Alert.alert(
        '오류',
        error.response?.data?.message || '견적 문의에 실패했습니다.',
      );
    },
  });

  const handleSubmit = () => {
    if (!category) {
      Alert.alert('알림', '카테고리를 선택해주세요.');
      return;
    }
    if (!city) {
      Alert.alert('알림', '지역을 선택해주세요.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('알림', '문의 내용을 입력해주세요.');
      return;
    }
    if (!contactPhone.trim()) {
      Alert.alert('알림', '연락처를 입력해주세요.');
      return;
    }
    createQuoteMutation.mutate();
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>견적 문의</Text>
        <Text style={styles.subtitle}>
          시공을 원하시는 내용을 상세히 적어주세요.
        </Text>

        <Text style={styles.label}>카테고리 *</Text>
        <View style={styles.chipsContainer}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, category === cat && styles.chipSelected]}
              onPress={() => setCategory(cat)}>
              <Text
                style={[
                  styles.chipText,
                  category === cat && styles.chipTextSelected,
                ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>지역 *</Text>
        <View style={styles.chipsContainer}>
          {CITIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, city === c && styles.chipSelected]}
              onPress={() => setCity(c)}>
              <Text
                style={[styles.chipText, city === c && styles.chipTextSelected]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>상세 지역 (선택)</Text>
        <TextInput
          style={styles.input}
          value={district}
          onChangeText={setDistrict}
          placeholder="예: 강남구 역삼동"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>평수 (선택)</Text>
        <TextInput
          style={styles.input}
          value={areaSize}
          onChangeText={setAreaSize}
          placeholder="예: 32"
          placeholderTextColor="#999"
          keyboardType="number-pad"
        />

        <Text style={styles.label}>문의 내용 *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="시공 범위, 원하는 스타일, 특별 요청사항 등을 상세히 적어주세요."
          placeholderTextColor="#999"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        <Text style={styles.label}>희망 시공 일정 (선택)</Text>
        <TextInput
          style={styles.input}
          value={preferredSchedule}
          onChangeText={setPreferredSchedule}
          placeholder="예: 2024년 3월 중"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>연락처 *</Text>
        <TextInput
          style={styles.input}
          value={contactPhone}
          onChangeText={setContactPhone}
          placeholder="010-0000-0000"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
        />

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>취소</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.submitButton,
            createQuoteMutation.isPending && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={createQuoteMutation.isPending}>
          {createQuoteMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>견적 문의하기</Text>
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
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  textArea: {
    height: 120,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chipSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
  },
  chipTextSelected: {
    color: '#2196F3',
    fontWeight: '600',
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#90CAF9',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
