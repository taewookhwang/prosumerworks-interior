import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';

export const MyPortfoliosScreen = () => {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['myPortfolios'],
    queryFn: async () => {
      const response = await api.get('/contractors/me');
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (portfolioId: string) => {
      await api.delete(`/portfolios/${portfolioId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPortfolios'] });
      Alert.alert('완료', '포트폴리오가 삭제되었습니다.');
    },
    onError: () => {
      Alert.alert('오류', '삭제에 실패했습니다.');
    },
  });

  const handleDelete = (portfolioId: string, title: string) => {
    Alert.alert(
      '포트폴리오 삭제',
      `"${title}"을(를) 삭제하시겠습니까?\n삭제된 포트폴리오는 복구할 수 없습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(portfolioId),
        },
      ],
    );
  };

  const portfolios = data?.portfolios || [];

  const renderItem = ({ item }: any) => {
    const thumbnailUrl = item.images?.[0]?.imageUrl || item.thumbnailUrl;
    return (
      <View style={styles.portfolioCard}>
        <TouchableOpacity
          onPress={() => navigation.navigate('PortfolioDetail', { id: item.id })}>
          {thumbnailUrl ? (
            <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Text style={styles.thumbnailPlaceholderText}>No Image</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.cardContent}>
          <TouchableOpacity
            onPress={() => navigation.navigate('PortfolioDetail', { id: item.id })}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.cardMeta}>
              {item.category} · {item.locationCity}
            </Text>
            <View style={styles.cardStats}>
              <Text style={styles.statText}>좋아요 {item.likeCount || 0}</Text>
              <Text style={styles.statText}>조회 {item.viewCount || 0}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate('PortfolioEdit', { id: item.id })}>
              <Text style={styles.editButtonText}>수정</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item.id, item.title)}>
              <Text style={styles.deleteButtonText}>삭제</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>내 포트폴리오</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('PortfolioCreate')}>
          <Text style={styles.addButtonText}>+ 추가</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={portfolios}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📷</Text>
            <Text style={styles.emptyTitle}>등록된 포트폴리오가 없습니다</Text>
            <Text style={styles.emptySubtitle}>
              시공 사례를 등록하고 고객을 만나보세요
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('PortfolioCreate')}>
              <Text style={styles.emptyButtonText}>첫 포트폴리오 등록하기</Text>
            </TouchableOpacity>
          </View>
        }
      />
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  portfolioCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 16,
  },
  thumbnail: {
    width: '100%',
    height: 180,
    backgroundColor: '#f5f5f5',
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailPlaceholderText: {
    color: '#999',
    fontSize: 14,
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  cardStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statText: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  editButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FFF5F5',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FF5252',
    fontSize: 14,
    fontWeight: '600',
  },
});
