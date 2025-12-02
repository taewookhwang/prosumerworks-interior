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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../../services/api';

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

export const PortfolioCreateScreen = () => {
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [areaSize, setAreaSize] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const handleAddImages = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 10,
      quality: 0.8,
    });

    if (result.assets) {
      const newImages = result.assets
        .filter((asset) => asset.uri)
        .map((asset) => asset.uri!);
      setImages((prev) => [...prev, ...newImages].slice(0, 10));
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImageToS3 = async (uri: string, index: number): Promise<string> => {
    const fileName = `portfolio_${Date.now()}_${index}.jpg`;
    const fileType = 'image/jpeg';

    // 1. Presigned URL 요청
    const { data } = await api.post('/uploads/presigned-url', {
      fileName,
      fileType,
      purpose: 'portfolios',
    });

    // 2. XMLHttpRequest로 S3에 업로드 (React Native에서 더 안정적)
    const uploadResponse = await fetch(uri);
    const blob = await uploadResponse.blob();

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', data.uploadUrl);
      xhr.setRequestHeader('Content-Type', fileType);

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data.fileUrl);
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during upload'));
      };

      xhr.send(blob);
    });
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('알림', '제목을 입력해주세요.');
      return;
    }
    if (!category) {
      Alert.alert('알림', '카테고리를 선택해주세요.');
      return;
    }
    if (images.length === 0) {
      Alert.alert('알림', '최소 1장의 이미지를 추가해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      // S3에 이미지 업로드
      const uploadedUrls = await Promise.all(
        images.map((uri, index) => uploadImageToS3(uri, index))
      );

      const imageData = uploadedUrls.map((url, index) => ({
        imageUrl: url,
        imageType: 'after',
        displayOrder: index,
      }));

      await api.post('/portfolios', {
        title: title.trim(),
        description: description.trim(),
        category,
        locationCity: city || undefined,
        areaSize: areaSize ? parseInt(areaSize, 10) : undefined,
        images: imageData,
      });

      Alert.alert('등록 완료', '포트폴리오가 등록되었습니다.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Portfolio upload error:', error);
      Alert.alert('오류', error.response?.data?.message || '다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>포트폴리오 등록</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#2196F3" />
          ) : (
            <Text style={styles.submitButton}>등록</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>사진 ({images.length}/10)</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imagesContainer}>
          <TouchableOpacity style={styles.addImageButton} onPress={handleAddImages}>
            <Ionicons name="add" size={28} color="#666" />
            <Text style={styles.addImageText}>사진 추가</Text>
          </TouchableOpacity>
          {images.map((uri, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image source={{ uri }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => handleRemoveImage(index)}>
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
              {index === 0 && (
                <View style={styles.mainBadge}>
                  <Text style={styles.mainBadgeText}>대표</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        <Text style={styles.label}>제목 *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="예: 강남 30평대 아파트 전체 리모델링"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>설명</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="시공 내용을 자세히 설명해주세요"
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

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

        <Text style={styles.label}>지역</Text>
        <View style={styles.chipsContainer}>
          {CITIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, city === c && styles.chipSelected]}
              onPress={() => setCity(city === c ? '' : c)}>
              <Text
                style={[styles.chipText, city === c && styles.chipTextSelected]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>평수</Text>
        <TextInput
          style={styles.input}
          value={areaSize}
          onChangeText={setAreaSize}
          placeholder="예: 32"
          placeholderTextColor="#999"
          keyboardType="number-pad"
        />

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
    fontSize: 16,
    color: '#666',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  submitButton: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  imagesContainer: {
    marginBottom: 24,
  },
  addImageButton: {
    width: 100,
    height: 100,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  addImageIcon: {
    fontSize: 32,
    color: '#999',
  },
  addImageText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 8,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mainBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: '#2196F3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mainBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
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
    height: 100,
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
});
