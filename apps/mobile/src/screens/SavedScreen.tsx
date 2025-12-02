import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portfolioService } from '../services/portfolio';
import { PortfolioCard } from '../components/PortfolioCard';
import { Portfolio } from '../types';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CARD_WIDTH = Dimensions.get('window').width * 0.42;

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

export const SavedScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['savedPortfolios'],
    queryFn: () => portfolioService.getSavedPortfolios(100),
  });

  const likeMutation = useMutation({
    mutationFn: ({ id, isLiked }: { id: string; isLiked: boolean }) =>
      isLiked
        ? portfolioService.unlikePortfolio(id)
        : portfolioService.likePortfolio(id),
    onMutate: async ({ id, isLiked }) => {
      await queryClient.cancelQueries({ queryKey: ['savedPortfolios'] });
      queryClient.setQueryData(['savedPortfolios'], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          items: oldData.items.map((item: Portfolio) =>
            item.id === id
              ? {
                  ...item,
                  isLiked: !isLiked,
                  likeCount: item.likeCount + (isLiked ? -1 : 1),
                }
              : item,
          ),
        };
      });
    },
  });

  const handleLike = useCallback(
    (portfolio: Portfolio) => {
      likeMutation.mutate({ id: portfolio.id, isLiked: portfolio.isLiked });
    },
    [likeMutation],
  );

  // Group portfolios by category
  const groupedByCategory = CATEGORIES.reduce((acc, category) => {
    const items = data?.items?.filter((item: Portfolio) => item.category === category) || [];
    if (items.length > 0) {
      acc[category] = items;
    }
    return acc;
  }, {} as Record<string, Portfolio[]>);

  // Also include uncategorized items
  const categorizedIds = new Set(
    Object.values(groupedByCategory).flat().map((p: Portfolio) => p.id)
  );
  const uncategorized = data?.items?.filter(
    (item: Portfolio) => !categorizedIds.has(item.id)
  ) || [];
  if (uncategorized.length > 0) {
    groupedByCategory['기타'] = uncategorized;
  }

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

  const categories = Object.keys(groupedByCategory);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>저장한 포트폴리오</Text>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {categories.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>저장한 포트폴리오가 없습니다.</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
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
});
