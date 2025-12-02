import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import apartmentsService, {
  Apartment,
  ApartmentFloorPlan,
  ApartmentStats,
} from '../services/apartmentsService';
import { FloorPlanAnalysis } from '../services/architectService';

interface ApartmentSelectorProps {
  onFloorPlanSelected: (floorPlan: ApartmentFloorPlan, analysis: FloorPlanAnalysis) => void;
  onClose?: () => void;
}

type SelectionStep = 'apartment' | 'type' | 'unit';

export const ApartmentSelector: React.FC<ApartmentSelectorProps> = ({
  onFloorPlanSelected,
  onClose,
}) => {
  const [step, setStep] = useState<SelectionStep>('apartment');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 데이터
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [apartmentStats, setApartmentStats] = useState<ApartmentStats | null>(null);
  const [floorPlans, setFloorPlans] = useState<ApartmentFloorPlan[]>([]);
  const [selectedFloorType, setSelectedFloorType] = useState<string | null>(null);

  // 검색
  const [searchQuery, setSearchQuery] = useState('');
  const [buildingNumber, setBuildingNumber] = useState('');
  const [unitNumber, setUnitNumber] = useState('');

  // 아파트 목록 로드
  useEffect(() => {
    loadApartments();
  }, []);

  const loadApartments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apartmentsService.getApartments();
      setApartments(data);
    } catch (err: any) {
      setError('아파트 목록을 불러오는데 실패했습니다.');
      console.error('Load apartments error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectApartment = async (apartment: Apartment) => {
    setSelectedApartment(apartment);
    setIsLoading(true);
    setError(null);
    try {
      const stats = await apartmentsService.getApartmentStats(apartment.id);
      setApartmentStats(stats);
      setStep('type');
    } catch (err: any) {
      setError('아파트 정보를 불러오는데 실패했습니다.');
      console.error('Load apartment stats error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFloorType = async (floorType: string) => {
    if (!selectedApartment) return;

    setSelectedFloorType(floorType);
    setIsLoading(true);
    setError(null);
    try {
      const plans = await apartmentsService.getFloorPlansByType(selectedApartment.id, floorType);
      setFloorPlans(plans);
      setStep('unit');
    } catch (err: any) {
      setError('도면 정보를 불러오는데 실패했습니다.');
      console.error('Load floor plans error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFloorPlan = async (floorPlan: ApartmentFloorPlan) => {
    setIsLoading(true);
    setError(null);
    try {
      const analysis = await apartmentsService.getFloorPlanAnalysis(floorPlan.id);
      onFloorPlanSelected(floorPlan, analysis);
    } catch (err: any) {
      setError('도면 분석 데이터를 불러오는데 실패했습니다.');
      console.error('Load floor plan analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchByUnit = async () => {
    if (!selectedApartment || !buildingNumber || !unitNumber) {
      setError('동/호수를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const plan = await apartmentsService.getFloorPlanByUnit(
        selectedApartment.id,
        buildingNumber,
        unitNumber
      );
      if (plan) {
        const analysis = await apartmentsService.getFloorPlanAnalysis(plan.id);
        onFloorPlanSelected(plan, analysis);
      } else {
        setError('해당 동/호수의 도면을 찾을 수 없습니다.');
      }
    } catch (err: any) {
      setError('도면 검색에 실패했습니다.');
      console.error('Search by unit error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'unit') {
      setStep('type');
      setSelectedFloorType(null);
      setFloorPlans([]);
    } else if (step === 'type') {
      setStep('apartment');
      setSelectedApartment(null);
      setApartmentStats(null);
    }
  };

  const filteredApartments = apartments.filter((apt) =>
    apt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    apt.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderApartmentStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>아파트 선택</Text>
      <Text style={styles.stepDescription}>시뮬레이션할 아파트를 선택해주세요</Text>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="아파트명 또는 주소 검색"
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {filteredApartments.map((apartment) => (
          <TouchableOpacity
            key={apartment.id}
            style={styles.listItem}
            onPress={() => handleSelectApartment(apartment)}>
            <View style={styles.listItemIcon}>
              <Ionicons name="business" size={24} color="#FF9800" />
            </View>
            <View style={styles.listItemContent}>
              <Text style={styles.listItemTitle}>{apartment.name}</Text>
              {apartment.address && (
                <Text style={styles.listItemSubtitle}>{apartment.address}</Text>
              )}
              {apartment.totalUnits && (
                <Text style={styles.listItemMeta}>
                  {apartment.totalBuildings}개동 / {apartment.totalUnits}세대
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        ))}
        {filteredApartments.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>검색 결과가 없습니다</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );

  const renderTypeStep = () => (
    <View style={styles.stepContent}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Ionicons name="arrow-back" size={24} color="#333" />
        <Text style={styles.backButtonText}>뒤로</Text>
      </TouchableOpacity>

      <Text style={styles.stepTitle}>{selectedApartment?.name}</Text>
      <Text style={styles.stepDescription}>평형 타입을 선택하세요</Text>

      {/* 직접 동/호수 입력 */}
      <View style={styles.unitSearchBox}>
        <Text style={styles.unitSearchTitle}>동/호수로 바로 찾기</Text>
        <View style={styles.unitSearchInputs}>
          <View style={styles.unitInputWrapper}>
            <TextInput
              style={styles.unitInput}
              placeholder="동"
              placeholderTextColor="#999"
              value={buildingNumber}
              onChangeText={setBuildingNumber}
              keyboardType="number-pad"
            />
            <Text style={styles.unitInputSuffix}>동</Text>
          </View>
          <View style={styles.unitInputWrapper}>
            <TextInput
              style={styles.unitInput}
              placeholder="호수"
              placeholderTextColor="#999"
              value={unitNumber}
              onChangeText={setUnitNumber}
              keyboardType="number-pad"
            />
            <Text style={styles.unitInputSuffix}>호</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.unitSearchButton,
              (!buildingNumber || !unitNumber) && styles.unitSearchButtonDisabled,
            ]}
            onPress={handleSearchByUnit}
            disabled={!buildingNumber || !unitNumber}>
            <Ionicons name="search" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.dividerText}>또는 평형 타입 선택</Text>

      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {apartmentStats?.floorTypes.map((floorType) => (
          <TouchableOpacity
            key={floorType}
            style={styles.typeItem}
            onPress={() => handleSelectFloorType(floorType)}>
            <View style={styles.typeItemIcon}>
              <Ionicons name="grid-outline" size={24} color="#2196F3" />
            </View>
            <View style={styles.typeItemContent}>
              <Text style={styles.typeItemTitle}>{floorType} 타입</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderUnitStep = () => (
    <View style={styles.stepContent}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Ionicons name="arrow-back" size={24} color="#333" />
        <Text style={styles.backButtonText}>뒤로</Text>
      </TouchableOpacity>

      <Text style={styles.stepTitle}>{selectedFloorType} 타입</Text>
      <Text style={styles.stepDescription}>도면을 선택하세요</Text>

      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {floorPlans.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            style={styles.planItem}
            onPress={() => handleSelectFloorPlan(plan)}>
            <View style={styles.planItemIcon}>
              <Ionicons name="document-text" size={24} color="#4CAF50" />
            </View>
            <View style={styles.planItemContent}>
              <Text style={styles.planItemTitle}>
                {plan.buildingNumber || '-'}동 {plan.unitNumber || '-'}호
              </Text>
              <View style={styles.planItemMeta}>
                {plan.areaPyeong && (
                  <Text style={styles.planItemMetaText}>{plan.areaPyeong}평</Text>
                )}
                {plan.roomCount && (
                  <Text style={styles.planItemMetaText}>방 {plan.roomCount}개</Text>
                )}
                {plan.bathroomCount && (
                  <Text style={styles.planItemMetaText}>화장실 {plan.bathroomCount}개</Text>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        ))}
        {floorPlans.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>등록된 도면이 없습니다</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>아파트 도면 선택</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9800" />
          <Text style={styles.loadingText}>불러오는 중...</Text>
        </View>
      ) : (
        <>
          {step === 'apartment' && renderApartmentStep()}
          {step === 'type' && renderTypeStep()}
          {step === 'unit' && renderUnitStep()}
        </>
      )}
    </View>
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
  closeButton: {
    padding: 4,
  },
  stepContent: {
    flex: 1,
    padding: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  listContainer: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  listItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  listItemSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  listItemMeta: {
    fontSize: 12,
    color: '#999',
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  typeItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  typeItemContent: {
    flex: 1,
  },
  typeItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  planItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  planItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planItemContent: {
    flex: 1,
  },
  planItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  planItemMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  planItemMetaText: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unitSearchBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  unitSearchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  unitSearchInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  unitInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
  },
  unitInputSuffix: {
    fontSize: 14,
    color: '#666',
  },
  unitSearchButton: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    padding: 12,
  },
  unitSearchButtonDisabled: {
    backgroundColor: '#ccc',
  },
  dividerText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#F44336',
    flex: 1,
  },
});

export default ApartmentSelector;
