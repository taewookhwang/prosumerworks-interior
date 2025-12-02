import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { portfolioService } from '../services/portfolio';
import { PortfolioCard } from '../components/PortfolioCard';
import { Portfolio } from '../types';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CARD_WIDTH = Dimensions.get('window').width * 0.42;

const CATEGORIES = [
  { value: '', label: '전체' },
  { value: '전체 인테리어', label: '전체 인테리어' },
  { value: '부분 인테리어', label: '부분 인테리어' },
  { value: '주방', label: '주방' },
  { value: '욕실', label: '욕실' },
  { value: '도배/장판', label: '도배/장판' },
  { value: '페인트', label: '페인트' },
  { value: '타일', label: '타일' },
  { value: '목공', label: '목공' },
];

const CATEGORY_VALUES = CATEGORIES.filter(c => c.value).map(c => c.value);

export const FeedScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);

  // Build query params
  const queryParams = {
    ...(searchText ? { search: searchText } : {}),
    ...(selectedCategory ? { category: selectedCategory } : {}),
  };

  // Fetch all portfolios
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['portfolios', queryParams],
    queryFn: ({ pageParam }) =>
      portfolioService.getFeed({
        cursor: pageParam,
        limit: 50,
        ...queryParams,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    initialPageParam: undefined as string | undefined,
  });

  const likeMutation = useMutation({
    mutationFn: ({ id, isLiked }: { id: string; isLiked: boolean }) =>
      isLiked
        ? portfolioService.unlikePortfolio(id)
        : portfolioService.likePortfolio(id),
    onMutate: async ({ id, isLiked }) => {
      const queryKey = ['portfolios', queryParams];
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            items: page.items.map((item: Portfolio) =>
              item.id === id
                ? {
                    ...item,
                    isLiked: !isLiked,
                    likeCount: item.likeCount + (isLiked ? -1 : 1),
                  }
                : item,
            ),
          })),
        };
      });
    },
  });

  const portfolios = data?.pages.flatMap((page) => page.items) ?? [];

  // Group portfolios by category
  const groupedByCategory = CATEGORY_VALUES.reduce((acc, category) => {
    const items = portfolios.filter((item: Portfolio) => item.category === category);
    if (items.length > 0) {
      acc[category] = items;
    }
    return acc;
  }, {} as Record<string, Portfolio[]>);

  const handleLike = useCallback(
    (portfolio: Portfolio) => {
      likeMutation.mutate({ id: portfolio.id, isLiked: portfolio.isLiked });
    },
    [likeMutation],
  );

  const handleSearch = () => {
    setIsFiltering(true);
    setShowFilterModal(false);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setIsFiltering(!!category);
    setShowFilterModal(false);
  };

  const clearFilters = () => {
    setSearchText('');
    setSelectedCategory('');
    setIsFiltering(false);
  };

  const renderHorizontalItem = useCallback(
    ({ item }: { item: Portfolio }) => (
      <View style={styles.horizontalCardWrapper}>
        <PortfolioCard
          portfolio={item}
          onPress={() => navigation.navigate('PortfolioDetail', { id: item.id })}
          onLike={() => handleLike(item)}
        />
      </View>
    ),
    [navigation, handleLike],
  );

  const categories = Object.keys(groupedByCategory);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>데이터를 불러올 수 없습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Interior</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={styles.filterIcon}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Filter active indicator */}
      {isFiltering && (searchText || selectedCategory) && (
        <View style={styles.searchActiveBar}>
          <Text style={styles.searchActiveText}>
            {searchText && `검색: "${searchText}"`}
            {searchText && selectedCategory && ' · '}
            {selectedCategory && `카테고리: ${selectedCategory}`}
          </Text>
          <TouchableOpacity onPress={clearFilters} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={18} color="#8e8e8e" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom =
            layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
          if (isCloseToBottom && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        scrollEventThrottle={400}
      >
        {categories.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {searchText ? '검색 결과가 없습니다.' : '포트폴리오가 없습니다.'}
            </Text>
          </View>
        ) : (
          categories.map((category) => (
            <View key={category} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category}</Text>
              <FlatList
                horizontal
                data={groupedByCategory[category]}
                renderItem={renderHorizontalItem}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              />
            </View>
          ))
        )}

        {isFetchingNextPage && (
          <View style={styles.footer}>
            <ActivityIndicator size="small" color="#2196F3" />
          </View>
        )}
      </ScrollView>

      {/* Search Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>검색</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#262626" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchInputContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="제목 또는 설명 검색"
                placeholderTextColor="#999"
                value={searchText}
                onChangeText={setSearchText}
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
              <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                <Text style={styles.searchButtonText}>검색</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSectionTitle}>카테고리 필터</Text>
            <ScrollView style={styles.categoryList}>
              {CATEGORIES.map(category => (
                <TouchableOpacity
                  key={category.value}
                  style={[
                    styles.categoryItem,
                    selectedCategory === category.value && styles.categoryItemActive,
                  ]}
                  onPress={() => handleCategorySelect(category.value)}
                >
                  <Text style={[
                    styles.categoryItemText,
                    selectedCategory === category.value && styles.categoryItemTextActive,
                  ]}>
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  filterButton: {
    padding: 8,
  },
  filterIcon: {
    fontSize: 20,
  },
  searchActiveBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#E3F2FD',
  },
  searchActiveText: {
    fontSize: 14,
    color: '#2196F3',
  },
  clearSearchText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: 'bold',
    padding: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#666',
    fontSize: 14,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
  },
  categorySection: {
    marginTop: 20,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  horizontalList: {
    paddingLeft: 16,
    paddingRight: 4,
  },
  horizontalCardWrapper: {
    width: CARD_WIDTH,
    marginRight: 16,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalClose: {
    fontSize: 20,
    color: '#999',
    padding: 4,
  },
  searchInputContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#333',
  },
  searchButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  modalSectionTitle: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  categoryList: {
    padding: 8,
  },
  categoryItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  categoryItemText: {
    fontSize: 15,
    color: '#333',
  },
  categoryItemActive: {
    backgroundColor: '#E3F2FD',
  },
  categoryItemTextActive: {
    color: '#2196F3',
    fontWeight: '600',
  },
});
