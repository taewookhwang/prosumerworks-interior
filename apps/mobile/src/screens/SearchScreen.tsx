import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { portfolioService } from '../services/portfolio';
import { PortfolioCard } from '../components/PortfolioCard';
import { Portfolio } from '../types';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SearchScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');

  const {
    data,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['search', submittedSearch],
    queryFn: () => portfolioService.getFeed({ search: submittedSearch, limit: 50 }),
    enabled: submittedSearch.length > 0,
  });

  const likeMutation = useMutation({
    mutationFn: ({ id, isLiked }: { id: string; isLiked: boolean }) =>
      isLiked
        ? portfolioService.unlikePortfolio(id)
        : portfolioService.likePortfolio(id),
    onMutate: async ({ id, isLiked }) => {
      await queryClient.cancelQueries({ queryKey: ['search', submittedSearch] });
      queryClient.setQueryData(['search', submittedSearch], (oldData: any) => {
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

  const handleSearch = useCallback(() => {
    if (searchText.trim()) {
      setSubmittedSearch(searchText.trim());
    }
  }, [searchText]);

  const handleClear = useCallback(() => {
    setSearchText('');
    setSubmittedSearch('');
  }, []);

  const handleLike = useCallback(
    (portfolio: Portfolio) => {
      likeMutation.mutate({ id: portfolio.id, isLiked: portfolio.isLiked });
    },
    [likeMutation],
  );

  const renderItem = useCallback(
    ({ item }: { item: Portfolio }) => (
      <PortfolioCard
        portfolio={item}
        onPress={() => navigation.navigate('PortfolioDetail', { id: item.id })}
        onLike={() => handleLike(item)}
      />
    ),
    [navigation, handleLike],
  );

  const portfolios = data?.items ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>탐색</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>O</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="인테리어 제목, 설명 검색"
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color="#8e8e8e" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>검색</Text>
        </TouchableOpacity>
      </View>

      {submittedSearch.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color="#c7c7c7" style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>인테리어 포트폴리오 검색</Text>
          <Text style={styles.emptyText}>
            제목이나 설명에 포함된 키워드로{'\n'}원하는 인테리어를 찾아보세요
          </Text>
        </View>
      ) : isLoading || isFetching ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : portfolios.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>!</Text>
          <Text style={styles.emptyTitle}>검색 결과 없음</Text>
          <Text style={styles.emptyText}>
            '{submittedSearch}'에 대한 검색 결과가 없습니다.{'\n'}
            다른 키워드로 검색해 보세요.
          </Text>
        </View>
      ) : (
        <FlatList
          data={portfolios}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              검색 결과 {portfolios.length}건
            </Text>
          }
        />
      )}
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
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 16,
    color: '#999',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    fontSize: 14,
    color: '#999',
  },
  searchButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    color: '#ddd',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  resultCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
});
