import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import designerService, {
  StyleSuggestion,
  InteriorStyle,
  RoomType,
  STYLE_NAMES,
  ROOM_NAMES,
  GenerateDesignResponse,
} from '../../services/designerService';
import { portfolioService } from '../../services/portfolio';
import { Portfolio } from '../../types';
import { FloorPlanAnalysis } from '../../services/architectService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 시점(View Point) 옵션
export type ViewPoint =
  | 'living_from_kitchen'
  | 'kitchen_from_living'
  | 'bedroom_entrance'
  | 'bathroom_entrance'
  | 'entrance_view'
  | 'window_view'
  | 'custom';

export const VIEW_POINT_OPTIONS: { id: ViewPoint; label: string; prompt: string }[] = [
  { id: 'living_from_kitchen', label: '주방에서 본 거실', prompt: 'view from kitchen looking towards living room' },
  { id: 'kitchen_from_living', label: '거실에서 본 주방', prompt: 'view from living room looking towards kitchen' },
  { id: 'bedroom_entrance', label: '침실 입구에서 본 방', prompt: 'view from bedroom entrance looking into the room' },
  { id: 'bathroom_entrance', label: '욕실 입구에서 본 욕실', prompt: 'view from bathroom entrance looking inside' },
  { id: 'entrance_view', label: '현관에서 본 실내', prompt: 'view from entrance hallway looking into the apartment' },
  { id: 'window_view', label: '창가 방향', prompt: 'view towards the windows with natural light' },
];

// 스타일 미리보기 이미지 (Unsplash)
const STYLE_PREVIEW_IMAGES: Record<InteriorStyle, string> = {
  modern: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=400',
  minimalist: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400',
  scandinavian: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=400',
  industrial: 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=400',
  natural: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
  classic: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400',
  luxurious: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=400',
  korean_modern: 'https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=400',
};

interface DesignSelectScreenProps {
  // Clean Slate 이미지 (도면 또는 빈 공간)
  baseImageUrl?: string;
  baseImageBase64?: string;
  // 건축사 에이전트의 도면 분석 결과
  floorPlanAnalysis?: FloorPlanAnalysis;
  // 콜백
  onDesignGenerated?: (result: GenerateDesignResponse) => void;
  onBack?: () => void;
}

export const DesignSelectScreen: React.FC<DesignSelectScreenProps> = ({
  baseImageUrl,
  baseImageBase64,
  floorPlanAnalysis,
  onDesignGenerated,
  onBack,
}) => {
  const [styles, setStyles] = useState<StyleSuggestion[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<InteriorStyle>('modern');
  const [selectedRoom, setSelectedRoom] = useState<RoomType>('living_room');
  const [selectedViewPoint, setSelectedViewPoint] = useState<ViewPoint | null>(null);
  const [customRequest, setCustomRequest] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [generatedResult, setGeneratedResult] = useState<GenerateDesignResponse | null>(null);
  const [selectedRefImages, setSelectedRefImages] = useState<string[]>([]);

  // 저장된 포트폴리오 로드
  const { data: savedPortfolios, isLoading: isLoadingSaved } = useQuery({
    queryKey: ['savedPortfolios'],
    queryFn: () => portfolioService.getSavedPortfolios(50),
  });

  // 스타일 목록 로드
  useEffect(() => {
    loadStyles();
  }, []);

  const loadStyles = async () => {
    try {
      const result = await designerService.getStyles();
      setStyles(result);
    } catch (error) {
      console.error('Failed to load styles:', error);
      // 기본 스타일 목록 사용
      setStyles([
        { id: 'modern', name: '모던', nameEn: 'Modern', description: '깔끔한 현대적 디자인', keywords: [] },
        { id: 'minimalist', name: '미니멀', nameEn: 'Minimalist', description: '단순하고 정돈된 공간', keywords: [] },
        { id: 'scandinavian', name: '북유럽', nameEn: 'Scandinavian', description: '따뜻한 우드 톤', keywords: [] },
        { id: 'natural', name: '내추럴', nameEn: 'Natural', description: '자연 소재와 식물', keywords: [] },
      ]);
    }
  };

  // 레퍼런스 이미지 선택 토글
  const toggleRefImage = useCallback((imageUrl: string) => {
    setSelectedRefImages(prev => {
      if (prev.includes(imageUrl)) {
        return prev.filter(url => url !== imageUrl);
      }
      if (prev.length >= 5) {
        Alert.alert('알림', '최대 5개까지 선택할 수 있습니다.');
        return prev;
      }
      return [...prev, imageUrl];
    });
  }, []);

  const handleGenerateDesign = useCallback(async () => {
    setIsLoading(true);
    setLoadingMessage('AI 디자이너가 인테리어를 구상하고 있습니다...');

    try {
      // 시점 프롬프트와 사용자 요청 결합
      let combinedRequest = '';
      if (selectedViewPoint) {
        const viewPointOption = VIEW_POINT_OPTIONS.find(v => v.id === selectedViewPoint);
        if (viewPointOption) {
          combinedRequest = viewPointOption.prompt;
        }
      }
      if (customRequest) {
        combinedRequest = combinedRequest
          ? `${combinedRequest}, ${customRequest}`
          : customRequest;
      }

      const result = await designerService.generateDesign({
        baseImageUrl,
        baseImageBase64,
        style: selectedStyle,
        roomType: selectedRoom,
        userRequest: combinedRequest || undefined,
        referenceImageUrls: selectedRefImages.length > 0 ? selectedRefImages : undefined,
        floorPlanAnalysis,
      });

      setGeneratedResult(result);

      if (result.success) {
        setLoadingMessage('');
        onDesignGenerated?.(result);
      } else {
        Alert.alert('생성 실패', result.error || '이미지 생성에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Design generation error:', error);
      Alert.alert('오류', '디자인 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [baseImageUrl, baseImageBase64, selectedStyle, selectedRoom, selectedViewPoint, customRequest, selectedRefImages, floorPlanAnalysis, onDesignGenerated]);

  const handleRetry = useCallback(() => {
    setGeneratedResult(null);
  }, []);

  const roomTypes: RoomType[] = ['living_room', 'bedroom', 'kitchen', 'bathroom', 'office'];

  // 스타일 선택 UI
  const renderStyleSelector = () => (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>인테리어 스타일 선택</Text>
      <Text style={sectionStyles.subtitle}>원하시는 스타일을 선택해주세요</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={sectionStyles.horizontalScroll}
        contentContainerStyle={sectionStyles.horizontalScrollContent}>
        {(styles.length > 0 ? styles : Object.keys(STYLE_NAMES).map(id => ({
          id: id as InteriorStyle,
          name: STYLE_NAMES[id as InteriorStyle],
          nameEn: id,
          description: '',
          keywords: [],
        }))).map((style) => (
          <TouchableOpacity
            key={style.id}
            style={[
              styleCardStyles.container,
              selectedStyle === style.id && styleCardStyles.selected,
            ]}
            onPress={() => setSelectedStyle(style.id)}>
            <Image
              source={{ uri: STYLE_PREVIEW_IMAGES[style.id] }}
              style={styleCardStyles.image}
            />
            <View style={styleCardStyles.overlay}>
              <Text style={styleCardStyles.name}>{style.name}</Text>
              <Text style={styleCardStyles.nameEn}>{style.nameEn}</Text>
            </View>
            {selectedStyle === style.id && (
              <View style={styleCardStyles.checkmark}>
                <Ionicons name="checkmark-circle" size={24} color="#FF9800" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // 공간 선택 UI
  const renderRoomSelector = () => (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>공간 선택</Text>
      <View style={roomStyles.grid}>
        {roomTypes.map((room) => (
          <TouchableOpacity
            key={room}
            style={[
              roomStyles.button,
              selectedRoom === room && roomStyles.buttonSelected,
            ]}
            onPress={() => setSelectedRoom(room)}>
            <Ionicons
              name={
                room === 'living_room' ? 'tv-outline' :
                room === 'bedroom' ? 'bed-outline' :
                room === 'kitchen' ? 'restaurant-outline' :
                room === 'bathroom' ? 'water-outline' :
                'desktop-outline'
              }
              size={24}
              color={selectedRoom === room ? '#fff' : '#666'}
            />
            <Text style={[
              roomStyles.buttonText,
              selectedRoom === room && roomStyles.buttonTextSelected,
            ]}>
              {ROOM_NAMES[room]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // 시점 선택 UI
  const renderViewPointSelector = () => (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>시점 선택 (선택)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={viewPointStyles.row}>
          {VIEW_POINT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                viewPointStyles.chip,
                selectedViewPoint === option.id && viewPointStyles.chipSelected,
              ]}
              onPress={() => setSelectedViewPoint(
                selectedViewPoint === option.id ? null : option.id
              )}>
              <Text style={[
                viewPointStyles.chipText,
                selectedViewPoint === option.id && viewPointStyles.chipTextSelected,
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  // 추가 요청 입력 UI
  const renderCustomRequest = () => (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>추가 요청사항 (선택)</Text>
      <TextInput
        style={inputStyles.textInput}
        placeholder="예: 밝고 따뜻한 느낌으로, 창가에 식물 배치..."
        placeholderTextColor="#999"
        value={customRequest}
        onChangeText={setCustomRequest}
        multiline
        numberOfLines={3}
      />
    </View>
  );

  // 레퍼런스 이미지 선택 UI (저장된 포트폴리오에서)
  const renderReferenceImages = () => {
    const portfolios = savedPortfolios?.items || [];

    if (portfolios.length === 0) {
      return (
        <View style={sectionStyles.container}>
          <Text style={sectionStyles.title}>레퍼런스 이미지 선택 (선택)</Text>
          <View style={refStyles.emptyBox}>
            <Ionicons name="bookmark-outline" size={32} color="#ccc" />
            <Text style={refStyles.emptyText}>저장한 포트폴리오가 없습니다</Text>
            <Text style={refStyles.emptySubtext}>마음에 드는 인테리어를 저장해보세요</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={sectionStyles.container}>
        <View style={refStyles.headerRow}>
          <Text style={sectionStyles.title}>레퍼런스 이미지 선택</Text>
          <Text style={refStyles.countBadge}>
            {selectedRefImages.length}/5
          </Text>
        </View>
        <Text style={sectionStyles.subtitle}>
          저장한 포트폴리오에서 원하는 스타일을 선택해주세요
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={sectionStyles.horizontalScroll}
          contentContainerStyle={sectionStyles.horizontalScrollContent}>
          {portfolios.map((portfolio: Portfolio) => {
            const imageUrl = portfolio.thumbnailUrl;
            if (!imageUrl) return null;

            const isSelected = selectedRefImages.includes(imageUrl);

            return (
              <TouchableOpacity
                key={portfolio.id}
                style={[
                  refStyles.imageCard,
                  isSelected && refStyles.imageCardSelected,
                ]}
                onPress={() => toggleRefImage(imageUrl)}>
                <Image
                  source={{ uri: imageUrl }}
                  style={refStyles.image}
                />
                <View style={refStyles.imageOverlay}>
                  <Text style={refStyles.imageTitle} numberOfLines={1}>
                    {portfolio.title}
                  </Text>
                </View>
                {isSelected && (
                  <View style={refStyles.checkmark}>
                    <Ionicons name="checkmark-circle" size={28} color="#E91E63" />
                  </View>
                )}
                {isSelected && (
                  <View style={refStyles.selectedBadge}>
                    <Text style={refStyles.selectedNumber}>
                      {selectedRefImages.indexOf(imageUrl) + 1}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // 결과 화면
  const renderResult = () => (
    <View style={resultStyles.container}>
      <Text style={resultStyles.title}>AI 디자인 결과</Text>

      {generatedResult?.imageUrl && (
        <Image
          source={{ uri: generatedResult.imageUrl }}
          style={resultStyles.image}
          resizeMode="cover"
        />
      )}

      <View style={resultStyles.infoBox}>
        <View style={resultStyles.infoRow}>
          <Text style={resultStyles.infoLabel}>스타일</Text>
          <Text style={resultStyles.infoValue}>
            {STYLE_NAMES[generatedResult?.style as InteriorStyle] || generatedResult?.style}
          </Text>
        </View>
        <View style={resultStyles.infoRow}>
          <Text style={resultStyles.infoLabel}>공간</Text>
          <Text style={resultStyles.infoValue}>
            {ROOM_NAMES[generatedResult?.roomType as RoomType] || generatedResult?.roomType}
          </Text>
        </View>
        {generatedResult?.note && (
          <Text style={resultStyles.note}>{generatedResult.note}</Text>
        )}
      </View>

      <View style={resultStyles.buttonRow}>
        <TouchableOpacity style={resultStyles.secondaryButton} onPress={handleRetry}>
          <Ionicons name="refresh" size={20} color="#666" />
          <Text style={resultStyles.secondaryButtonText}>다시 생성</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={resultStyles.primaryButton}
          onPress={() => Alert.alert('완료', '디자인이 저장되었습니다.')}>
          <Ionicons name="checkmark" size={20} color="#fff" />
          <Text style={resultStyles.primaryButtonText}>이 디자인으로 결정</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={mainStyles.container} edges={['top']}>
      <View style={mainStyles.header}>
        <TouchableOpacity onPress={onBack} style={mainStyles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={mainStyles.headerTitle}>디자인 선택</Text>
        <View style={mainStyles.headerBadge}>
          <Ionicons name="color-palette" size={14} color="#E91E63" />
          <Text style={mainStyles.headerBadgeText}>AI 디자이너</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={mainStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#E91E63" />
          <Text style={mainStyles.loadingText}>{loadingMessage}</Text>
        </View>
      ) : generatedResult?.success ? (
        <ScrollView style={mainStyles.content} showsVerticalScrollIndicator={false}>
          {renderResult()}
        </ScrollView>
      ) : (
        <ScrollView style={mainStyles.content} showsVerticalScrollIndicator={false}>
          {renderStyleSelector()}
          {renderRoomSelector()}
          {renderViewPointSelector()}
          {renderReferenceImages()}
          {renderCustomRequest()}

          <TouchableOpacity
            style={mainStyles.generateButton}
            onPress={handleGenerateDesign}>
            <Ionicons name="sparkles" size={20} color="#fff" />
            <Text style={mainStyles.generateButtonText}>디자인 생성하기</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

// 스타일 정의
const mainStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginLeft: 12,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCE4EC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E91E63',
    marginLeft: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: '#666',
    marginTop: 16,
  },
  generateButton: {
    flexDirection: 'row',
    backgroundColor: '#E91E63',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
});

const sectionStyles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  horizontalScroll: {
    marginHorizontal: -16,
  },
  horizontalScrollContent: {
    paddingHorizontal: 16,
  },
});

const styleCardStyles = StyleSheet.create({
  container: {
    width: 140,
    height: 180,
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selected: {
    borderColor: '#FF9800',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  nameEn: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
});

const roomStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  buttonSelected: {
    backgroundColor: '#E91E63',
    borderColor: '#E91E63',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 8,
  },
  buttonTextSelected: {
    color: '#fff',
  },
});

const viewPointStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 10,
  },
  chipSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  chipTextSelected: {
    color: '#fff',
  },
});

const inputStyles = StyleSheet.create({
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 80,
    textAlignVertical: 'top',
  },
});

const resultStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    marginBottom: 16,
  },
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  note: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    borderRadius: 12,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
  },
  primaryButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E91E63',
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
});

const refStyles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  countBadge: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E91E63',
    backgroundColor: '#FCE4EC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emptyBox: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  imageCard: {
    width: 120,
    height: 150,
    borderRadius: 10,
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  imageCardSelected: {
    borderColor: '#E91E63',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 6,
  },
  imageTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  checkmark: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#fff',
    borderRadius: 14,
  },
  selectedBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#E91E63',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});

export default DesignSelectScreen;
