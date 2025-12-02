import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import architectService, {
  FloorPlanAnalysis,
  DemolitionValidation,
  StructuralElement,
} from '../../services/architectService';
import { DesignSelectScreen } from './DesignSelectScreen';
import { GenerateDesignResponse } from '../../services/designerService';
import { ApartmentSelector } from '../../components/ApartmentSelector';
import { ApartmentFloorPlan } from '../../services/apartmentsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type SimulationStep = 'upload' | 'analysis' | 'demolition' | 'cleanSlate' | 'design';

const ELEMENT_TYPE_LABELS: Record<string, string> = {
  load_bearing_wall: '내력벽',
  non_load_bearing_wall: '비내력벽',
  pillar: '기둥',
  beam: '보',
  window: '창문',
  door: '문',
  plumbing: '배관',
  electrical: '전기',
  hvac: '냉난방',
};

const RISK_COLORS: Record<string, string> = {
  none: '#4CAF50',
  low: '#8BC34A',
  medium: '#FF9800',
  high: '#F44336',
};

type UploadMode = 'image' | 'apartment';

export const SimulationScreen = () => {
  const [step, setStep] = useState<SimulationStep>('upload');
  const [uploadMode, setUploadMode] = useState<UploadMode>('apartment');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [propertyType, setPropertyType] = useState<string>('아파트');
  const [showApartmentSelector, setShowApartmentSelector] = useState(false);
  const [selectedApartmentPlan, setSelectedApartmentPlan] = useState<ApartmentFloorPlan | null>(null);

  const [floorPlanAnalysis, setFloorPlanAnalysis] = useState<FloorPlanAnalysis | null>(null);
  const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set());
  const [demolitionValidation, setDemolitionValidation] = useState<DemolitionValidation | null>(null);
  const [generatedDesign, setGeneratedDesign] = useState<GenerateDesignResponse | null>(null);

  const handleSelectImage = useCallback(() => {
    Alert.alert(
      '도면 이미지 선택',
      '도면 이미지를 어디서 가져올까요?',
      [
        {
          text: '카메라',
          onPress: () => {
            launchCamera(
              { mediaType: 'photo', includeBase64: true, quality: 0.8 },
              (response) => {
                if (response.assets && response.assets[0]) {
                  setImageUri(response.assets[0].uri || null);
                  setImageBase64(response.assets[0].base64 || null);
                }
              }
            );
          },
        },
        {
          text: '갤러리',
          onPress: () => {
            launchImageLibrary(
              { mediaType: 'photo', includeBase64: true, quality: 0.8 },
              (response) => {
                if (response.assets && response.assets[0]) {
                  setImageUri(response.assets[0].uri || null);
                  setImageBase64(response.assets[0].base64 || null);
                }
              }
            );
          },
        },
        { text: '취소', style: 'cancel' },
      ]
    );
  }, []);

  const handleAnalyzeFloorPlan = useCallback(async () => {
    if (!imageBase64) {
      Alert.alert('오류', '도면 이미지를 먼저 선택해주세요.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('AI 건축사가 도면을 분석하고 있습니다...');

    try {
      const result = await architectService.analyzeFloorPlan({
        imageBase64,
        propertyType,
      });

      setFloorPlanAnalysis(result);
      setStep('analysis');
    } catch (error: any) {
      console.error('Floor plan analysis error:', error);
      Alert.alert('분석 실패', '도면 분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [imageBase64, propertyType]);

  const handleToggleElement = useCallback((label: string) => {
    setSelectedElements((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  const handleValidateDemolition = useCallback(async () => {
    if (!floorPlanAnalysis || selectedElements.size === 0) {
      Alert.alert('선택 필요', '철거할 구조물을 선택해주세요.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('철거 안전성을 검증하고 있습니다...');

    try {
      const result = await architectService.validateDemolition(
        floorPlanAnalysis,
        Array.from(selectedElements)
      );

      setDemolitionValidation(result);
      setStep('demolition');
    } catch (error: any) {
      console.error('Demolition validation error:', error);
      const errorMessage = error.response?.data?.detail || error.message || '알 수 없는 오류';
      Alert.alert(
        '검증 실패',
        `철거 검증 중 오류가 발생했습니다.\n\n상세: ${errorMessage}`
      );
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [floorPlanAnalysis, selectedElements]);

  const handleProceedToCleanSlate = useCallback(() => {
    setStep('cleanSlate');
  }, []);

  const handleProceedToDesign = useCallback(() => {
    setStep('design');
  }, []);

  const handleDesignGenerated = useCallback((result: GenerateDesignResponse) => {
    setGeneratedDesign(result);
  }, []);

  const handleApartmentFloorPlanSelected = useCallback((
    floorPlan: ApartmentFloorPlan,
    analysis: FloorPlanAnalysis
  ) => {
    setSelectedApartmentPlan(floorPlan);
    setFloorPlanAnalysis(analysis);
    setShowApartmentSelector(false);
    setStep('analysis');
  }, []);

  const handleReset = useCallback(() => {
    setStep('upload');
    setUploadMode('apartment');
    setImageUri(null);
    setImageBase64(null);
    setFloorPlanAnalysis(null);
    setSelectedElements(new Set());
    setDemolitionValidation(null);
    setGeneratedDesign(null);
    setSelectedApartmentPlan(null);
  }, []);

  const renderUploadStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Ionicons name="document-text-outline" size={48} color="#FF9800" />
        <Text style={styles.stepTitle}>도면 분석</Text>
        <Text style={styles.stepDescription}>
          등록된 아파트 도면을 선택하거나, 직접 도면 이미지를 업로드하세요.
        </Text>
      </View>

      {/* 모드 선택 탭 */}
      <View style={styles.modeTabContainer}>
        <TouchableOpacity
          style={[styles.modeTab, uploadMode === 'apartment' && styles.modeTabActive]}
          onPress={() => setUploadMode('apartment')}>
          <Ionicons
            name="business"
            size={20}
            color={uploadMode === 'apartment' ? '#FF9800' : '#666'}
          />
          <Text
            style={[
              styles.modeTabText,
              uploadMode === 'apartment' && styles.modeTabTextActive,
            ]}>
            아파트 선택
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, uploadMode === 'image' && styles.modeTabActive]}
          onPress={() => setUploadMode('image')}>
          <Ionicons
            name="image"
            size={20}
            color={uploadMode === 'image' ? '#FF9800' : '#666'}
          />
          <Text
            style={[
              styles.modeTabText,
              uploadMode === 'image' && styles.modeTabTextActive,
            ]}>
            이미지 업로드
          </Text>
        </TouchableOpacity>
      </View>

      {uploadMode === 'apartment' ? (
        /* 아파트 선택 모드 */
        <View>
          {selectedApartmentPlan ? (
            <View style={styles.selectedApartmentBox}>
              <View style={styles.selectedApartmentInfo}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <View style={styles.selectedApartmentText}>
                  <Text style={styles.selectedApartmentTitle}>
                    {selectedApartmentPlan.buildingNumber}동 {selectedApartmentPlan.unitNumber}호
                  </Text>
                  <Text style={styles.selectedApartmentSubtitle}>
                    {selectedApartmentPlan.floorType} 타입 / {selectedApartmentPlan.areaPyeong}평
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.changeApartmentButton}
                onPress={() => setShowApartmentSelector(true)}>
                <Text style={styles.changeApartmentText}>변경</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.selectApartmentBox}
              onPress={() => setShowApartmentSelector(true)}>
              <View style={styles.selectApartmentIcon}>
                <Ionicons name="business-outline" size={48} color="#FF9800" />
              </View>
              <Text style={styles.selectApartmentTitle}>아파트 도면 선택</Text>
              <Text style={styles.selectApartmentSubtitle}>
                등록된 아파트의 DWG 도면을 불러옵니다
              </Text>
              <View style={styles.selectApartmentBadge}>
                <Ionicons name="flash" size={14} color="#fff" />
                <Text style={styles.selectApartmentBadgeText}>정밀 분석</Text>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              !selectedApartmentPlan && styles.primaryButtonDisabled,
            ]}
            onPress={() => selectedApartmentPlan && setStep('analysis')}
            disabled={!selectedApartmentPlan}>
            <Text style={styles.primaryButtonText}>분석 결과 보기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* 이미지 업로드 모드 */
        <View>
          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="contain" />
              <TouchableOpacity style={styles.changeImageButton} onPress={handleSelectImage}>
                <Text style={styles.changeImageText}>이미지 변경</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadBox} onPress={handleSelectImage}>
              <Ionicons name="cloud-upload-outline" size={64} color="#ccc" />
              <Text style={styles.uploadText}>도면 이미지 업로드</Text>
              <Text style={styles.uploadSubtext}>탭하여 이미지 선택</Text>
            </TouchableOpacity>
          )}

          <View style={styles.propertyTypeContainer}>
            <Text style={styles.propertyTypeLabel}>건물 유형</Text>
            <View style={styles.propertyTypeButtons}>
              {['아파트', '빌라', '주택'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.propertyTypeButton,
                    propertyType === type && styles.propertyTypeButtonActive,
                  ]}
                  onPress={() => setPropertyType(type)}>
                  <Text
                    style={[
                      styles.propertyTypeButtonText,
                      propertyType === type && styles.propertyTypeButtonTextActive,
                    ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, !imageUri && styles.primaryButtonDisabled]}
            onPress={handleAnalyzeFloorPlan}
            disabled={!imageUri || isLoading}>
            <Text style={styles.primaryButtonText}>도면 분석 시작</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderAnalysisStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.analysisHeader}>
        <Text style={styles.analysisTitle}>분석 결과</Text>
        {floorPlanAnalysis && (
          <View style={styles.analysisSummary}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{floorPlanAnalysis.estimatedArea || '-'}평</Text>
              <Text style={styles.summaryLabel}>추정 면적</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{floorPlanAnalysis.roomCount}개</Text>
              <Text style={styles.summaryLabel}>방</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{floorPlanAnalysis.bathroomCount}개</Text>
              <Text style={styles.summaryLabel}>화장실</Text>
            </View>
          </View>
        )}
      </View>

      {floorPlanAnalysis?.analysisSummary && (
        <View style={styles.summaryBox}>
          <Text style={styles.summaryBoxText}>{floorPlanAnalysis.analysisSummary}</Text>
        </View>
      )}

      {floorPlanAnalysis?.warnings && floorPlanAnalysis.warnings.length > 0 && (
        <View style={styles.warningsBox}>
          <Ionicons name="warning-outline" size={20} color="#FF9800" />
          <View style={styles.warningsList}>
            {floorPlanAnalysis.warnings.map((warning, index) => (
              <Text key={index} style={styles.warningText}>
                {warning}
              </Text>
            ))}
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>구조물 선택 (철거할 항목 선택)</Text>

      <ScrollView style={styles.elementsList} showsVerticalScrollIndicator={false}>
        {floorPlanAnalysis?.elements.map((element, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.elementItem,
              selectedElements.has(element.label) && styles.elementItemSelected,
              !element.isDemolishable && styles.elementItemDisabled,
            ]}
            onPress={() => element.isDemolishable && handleToggleElement(element.label)}
            disabled={!element.isDemolishable}>
            <View style={styles.elementInfo}>
              <View style={styles.elementHeader}>
                <Text style={styles.elementLabel}>{element.label}</Text>
                <View
                  style={[
                    styles.riskBadge,
                    { backgroundColor: RISK_COLORS[element.demolitionRisk] },
                  ]}>
                  <Text style={styles.riskBadgeText}>
                    {element.demolitionRisk === 'none'
                      ? '안전'
                      : element.demolitionRisk === 'low'
                      ? '낮음'
                      : element.demolitionRisk === 'medium'
                      ? '주의'
                      : '위험'}
                  </Text>
                </View>
              </View>
              <Text style={styles.elementType}>
                {ELEMENT_TYPE_LABELS[element.elementType] || element.elementType}
              </Text>
              {element.demolitionNote && (
                <Text style={styles.elementNote}>{element.demolitionNote}</Text>
              )}
            </View>
            <View style={styles.elementCheckbox}>
              {element.isDemolishable ? (
                selectedElements.has(element.label) ? (
                  <Ionicons name="checkbox" size={24} color="#FF9800" />
                ) : (
                  <Ionicons name="square-outline" size={24} color="#ccc" />
                )
              ) : (
                <Ionicons name="lock-closed" size={20} color="#999" />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[styles.primaryButton, selectedElements.size === 0 && styles.primaryButtonDisabled]}
        onPress={handleValidateDemolition}
        disabled={selectedElements.size === 0 || isLoading}>
        <Text style={styles.primaryButtonText}>
          철거 검증 ({selectedElements.size}개 선택)
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderDemolitionStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.validationHeader}>
        <View
          style={[
            styles.validationStatus,
            demolitionValidation?.isSafe ? styles.validationSafe : styles.validationUnsafe,
          ]}>
          <Ionicons
            name={demolitionValidation?.isSafe ? 'shield-checkmark' : 'warning'}
            size={32}
            color="#fff"
          />
        </View>
        <Text style={styles.validationTitle}>
          {demolitionValidation?.isSafe ? '철거 가능' : '주의 필요'}
        </Text>
        <Text style={styles.validationSubtitle}>
          위험도: {demolitionValidation?.riskLevel === 'low' ? '낮음' : demolitionValidation?.riskLevel === 'medium' ? '보통' : '높음'}
        </Text>
      </View>

      {demolitionValidation?.structuralImpact && (
        <View style={styles.impactBox}>
          <Text style={styles.impactTitle}>구조적 영향</Text>
          <Text style={styles.impactText}>{demolitionValidation.structuralImpact}</Text>
        </View>
      )}

      {demolitionValidation?.recommendations && demolitionValidation.recommendations.length > 0 && (
        <View style={styles.recommendationsBox}>
          <Text style={styles.recommendationsTitle}>권장 사항</Text>
          {demolitionValidation.recommendations.map((rec, index) => (
            <View key={index} style={styles.recommendationItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.recommendationText}>{rec}</Text>
            </View>
          ))}
        </View>
      )}

      {demolitionValidation?.warnings && demolitionValidation.warnings.length > 0 && (
        <View style={styles.warningsBox}>
          <Ionicons name="warning-outline" size={20} color="#FF9800" />
          <View style={styles.warningsList}>
            {demolitionValidation.warnings.map((warning, index) => (
              <Text key={index} style={styles.warningText}>
                {warning}
              </Text>
            ))}
          </View>
        </View>
      )}

      {demolitionValidation?.estimatedDemolitionCost && (
        <View style={styles.costBox}>
          <Text style={styles.costLabel}>예상 철거 비용</Text>
          <Text style={styles.costValue}>
            약 {demolitionValidation.estimatedDemolitionCost}만원
          </Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep('analysis')}>
          <Text style={styles.secondaryButtonText}>다시 선택</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={handleProceedToCleanSlate}>
          <Text style={styles.primaryButtonText}>Clean Slate 보기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCleanSlateStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.cleanSlateHeader}>
        <Ionicons name="layers-outline" size={48} color="#2196F3" />
        <Text style={styles.cleanSlateTitle}>Clean Slate</Text>
        <Text style={styles.cleanSlateSubtitle}>철거 후 예상 상태</Text>
      </View>

      <View style={styles.cleanSlateStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{floorPlanAnalysis?.elements.length || 0}</Text>
          <Text style={styles.statLabel}>전체 구조물</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F44336' }]}>{selectedElements.size}</Text>
          <Text style={styles.statLabel}>철거 예정</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#4CAF50' }]}>
            {(floorPlanAnalysis?.elements.length || 0) - selectedElements.size}
          </Text>
          <Text style={styles.statLabel}>유지</Text>
        </View>
      </View>

      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>유지되는 구조물</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#F44336' }]} />
          <Text style={styles.legendText}>철거 예정</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#9E9E9E' }]} />
          <Text style={styles.legendText}>내력벽 (철거 불가)</Text>
        </View>
      </View>

      <ScrollView style={styles.cleanSlateList}>
        {floorPlanAnalysis?.elements.map((element, index) => {
          const isSelected = selectedElements.has(element.label);
          const isLoadBearing = element.elementType === 'load_bearing_wall';

          return (
            <View
              key={index}
              style={[
                styles.cleanSlateItem,
                isSelected && styles.cleanSlateItemDemolished,
                isLoadBearing && styles.cleanSlateItemLoadBearing,
              ]}>
              <Ionicons
                name={isSelected ? 'close-circle' : 'checkmark-circle'}
                size={24}
                color={isLoadBearing ? '#9E9E9E' : isSelected ? '#F44336' : '#4CAF50'}
              />
              <View style={styles.cleanSlateItemInfo}>
                <Text style={styles.cleanSlateItemLabel}>{element.label}</Text>
                <Text style={styles.cleanSlateItemType}>
                  {ELEMENT_TYPE_LABELS[element.elementType] || element.elementType}
                </Text>
              </View>
              <Text
                style={[
                  styles.cleanSlateItemStatus,
                  { color: isLoadBearing ? '#9E9E9E' : isSelected ? '#F44336' : '#4CAF50' },
                ]}>
                {isLoadBearing ? '보존' : isSelected ? '철거' : '유지'}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleReset}>
          <Text style={styles.secondaryButtonText}>처음부터</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleProceedToDesign}>
          <Ionicons name="color-palette" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.primaryButtonText}>디자인 선택</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDesignStep = () => (
    <DesignSelectScreen
      baseImageBase64={imageBase64 || undefined}
      floorPlanAnalysis={floorPlanAnalysis || undefined}
      onDesignGenerated={handleDesignGenerated}
      onBack={() => setStep('cleanSlate')}
    />
  );

  const renderStepIndicator = () => {
    if (step === 'design') return null; // 디자인 화면에서는 step indicator 숨김

    const visibleSteps = ['upload', 'analysis', 'demolition', 'cleanSlate'];
    const currentIndex = visibleSteps.indexOf(step);

    return (
      <View style={styles.stepIndicator}>
        {visibleSteps.map((s, index) => (
          <React.Fragment key={s}>
            <View
              style={[
                styles.stepDot,
                step === s && styles.stepDotActive,
                currentIndex >= index && styles.stepDotCompleted,
              ]}>
              <Text
                style={[
                  styles.stepDotText,
                  currentIndex >= index && styles.stepDotTextActive,
                ]}>
                {index + 1}
              </Text>
            </View>
            {index < visibleSteps.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  currentIndex > index && styles.stepLineActive,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  // 디자인 단계는 별도의 전체 화면으로 렌더링
  if (step === 'design') {
    return renderDesignStep();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>시공 시뮬레이션</Text>
        <View style={styles.headerBadge}>
          <Ionicons name="construct" size={14} color="#2196F3" />
          <Text style={styles.headerBadgeText}>AI 건축사</Text>
        </View>
      </View>

      {renderStepIndicator()}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9800" />
          <Text style={styles.loadingText}>{loadingMessage}</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {step === 'upload' && renderUploadStep()}
          {step === 'analysis' && renderAnalysisStep()}
          {step === 'demolition' && renderDemolitionStep()}
          {step === 'cleanSlate' && renderCleanSlateStep()}
        </ScrollView>
      )}

      {/* 아파트 선택 모달 */}
      <Modal
        visible={showApartmentSelector}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowApartmentSelector(false)}>
        <ApartmentSelector
          onFloorPlanSelected={handleApartmentFloorPlanSelected}
          onClose={() => setShowApartmentSelector(false)}
        />
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
    marginLeft: 4,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: '#FF9800',
  },
  stepDotCompleted: {
    backgroundColor: '#FF9800',
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  stepDotTextActive: {
    color: '#fff',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: '#FF9800',
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 16,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  uploadBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    paddingVertical: 48,
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  imagePreviewContainer: {
    marginBottom: 20,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  changeImageButton: {
    alignSelf: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
  },
  changeImageText: {
    fontSize: 13,
    color: '#666',
  },
  propertyTypeContainer: {
    marginBottom: 20,
  },
  propertyTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  propertyTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  propertyTypeButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  propertyTypeButtonActive: {
    backgroundColor: '#FF9800',
  },
  propertyTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  propertyTypeButtonTextActive: {
    color: '#fff',
  },
  primaryButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
  },
  primaryButtonDisabled: {
    backgroundColor: '#ccc',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
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
  analysisHeader: {
    marginBottom: 16,
  },
  analysisTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  analysisSummary: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF9800',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  summaryBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryBoxText: {
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  warningsBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  warningsList: {
    flex: 1,
    marginLeft: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  elementsList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  elementItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  elementItemSelected: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  elementItemDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.7,
  },
  elementInfo: {
    flex: 1,
  },
  elementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  elementLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  elementType: {
    fontSize: 12,
    color: '#666',
  },
  elementNote: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  elementCheckbox: {
    marginLeft: 12,
  },
  validationHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  validationStatus: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  validationSafe: {
    backgroundColor: '#4CAF50',
  },
  validationUnsafe: {
    backgroundColor: '#FF9800',
  },
  validationTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  validationSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  impactBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  impactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  impactText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  recommendationsBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  recommendationText: {
    fontSize: 13,
    color: '#2E7D32',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  costBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costLabel: {
    fontSize: 14,
    color: '#666',
  },
  costValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF9800',
  },
  cleanSlateHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  cleanSlateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
  },
  cleanSlateSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  cleanSlateStats: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#666',
  },
  cleanSlateList: {
    maxHeight: 280,
    marginBottom: 16,
  },
  cleanSlateItem: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  cleanSlateItemDemolished: {
    backgroundColor: '#FFEBEE',
  },
  cleanSlateItemLoadBearing: {
    backgroundColor: '#EEEEEE',
  },
  cleanSlateItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cleanSlateItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  cleanSlateItemType: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  cleanSlateItemStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  // 모드 탭 스타일
  modeTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modeTabTextActive: {
    color: '#FF9800',
  },
  // 아파트 선택 박스
  selectApartmentBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FF9800',
    borderStyle: 'dashed',
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  selectApartmentIcon: {
    marginBottom: 12,
  },
  selectApartmentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  selectApartmentSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  selectApartmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  selectApartmentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  // 선택된 아파트 표시
  selectedApartmentBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedApartmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedApartmentText: {
    marginLeft: 12,
  },
  selectedApartmentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E7D32',
  },
  selectedApartmentSubtitle: {
    fontSize: 13,
    color: '#4CAF50',
    marginTop: 2,
  },
  changeApartmentButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeApartmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
});

export default SimulationScreen;
