import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

type QuoteStatus = 'pending' | 'viewed' | 'responded' | 'completed' | 'cancelled';

interface Quote {
  id: string;
  category: string;
  locationCity: string;
  locationDistrict?: string;
  areaSize?: number;
  description: string;
  preferredSchedule?: string;
  contactPhone: string;
  status: QuoteStatus;
  contractorResponse?: string;
  respondedAt?: string;
  createdAt: string;
  contractor?: {
    id: string;
    companyName: string;
    user?: {
      id: string;
      name: string;
      profileImage?: string;
    };
  };
  portfolio?: {
    id: string;
    title: string;
  };
}

const STATUS_LABELS: Record<QuoteStatus, string> = {
  pending: '대기중',
  viewed: '확인됨',
  responded: '답변 도착',
  completed: '완료',
  cancelled: '취소됨',
};

const STATUS_COLORS: Record<QuoteStatus, string> = {
  pending: '#FF9800',
  viewed: '#2196F3',
  responded: '#4CAF50',
  completed: '#9E9E9E',
  cancelled: '#F44336',
};

export const MyQuotesScreen = () => {
  const navigation = useNavigation<any>();
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  const { data: quotes, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['myQuotes'],
    queryFn: async () => {
      const response = await api.get('/quotes/my');
      return response.data as Quote[];
    },
  });

  const handleStartChat = async (quote: Quote) => {
    if (quote.contractor?.user?.id) {
      try {
        const response = await api.post('/chat/rooms', {
          recipientId: quote.contractor.user.id,
          quoteId: quote.id,
        });
        const chatRoom = response.data;
        setSelectedQuote(null);
        navigation.navigate('ChatRoom', {
          roomId: chatRoom.id,
          recipientName: quote.contractor.companyName || quote.contractor.user.name,
        });
      } catch (error) {
        console.error('Failed to create chat room:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return '오늘';
    } else if (diffDays === 1) {
      return '어제';
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    }
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const renderQuoteItem = ({ item }: { item: Quote }) => (
    <TouchableOpacity
      style={[styles.quoteCard, item.status === 'responded' && styles.respondedCard]}
      onPress={() => setSelectedQuote(item)}>
      <View style={styles.quoteHeader}>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] }]}>
          <Text style={styles.statusText}>{STATUS_LABELS[item.status]}</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
      </View>

      <Text style={styles.categoryText}>{item.category}</Text>
      <Text style={styles.locationText}>
        {item.locationCity} {item.locationDistrict}
        {item.areaSize ? ` · ${item.areaSize}평` : ''}
      </Text>

      {item.contractor && (
        <Text style={styles.contractorText}>
          {item.contractor.companyName || item.contractor.user?.name}
        </Text>
      )}

      {item.status === 'responded' && (
        <View style={styles.responsePreview}>
          <Text style={styles.responsePreviewLabel}>견적서 도착!</Text>
          <Text style={styles.responsePreviewText} numberOfLines={2}>
            {item.contractorResponse?.substring(0, 100)}...
          </Text>
        </View>
      )}
    </TouchableOpacity>
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>내 견적요청</Text>
        <Text style={styles.headerSubtitle}>
          {quotes?.filter(q => q.status === 'responded').length || 0}건의 답변 도착
        </Text>
      </View>

      <FlatList
        data={quotes}
        keyExtractor={(item) => item.id}
        renderItem={renderQuoteItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>견적요청 내역이 없습니다</Text>
            <Text style={styles.emptySubtext}>
              마음에 드는 포트폴리오에서 견적을 요청해보세요
            </Text>
          </View>
        }
      />

      {/* Quote Detail Modal */}
      <Modal
        visible={!!selectedQuote}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedQuote(null)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedQuote(null)}>
              <Text style={styles.closeButton}>닫기</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>견적요청 상세</Text>
            <View style={{ width: 40 }} />
          </View>

          {selectedQuote && (
            <ScrollView style={styles.modalContent}>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selectedQuote.status], alignSelf: 'flex-start' }]}>
                <Text style={styles.statusText}>{STATUS_LABELS[selectedQuote.status]}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>카테고리</Text>
                <Text style={styles.detailValue}>{selectedQuote.category}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>지역</Text>
                <Text style={styles.detailValue}>
                  {selectedQuote.locationCity} {selectedQuote.locationDistrict}
                </Text>
              </View>

              {selectedQuote.areaSize && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>평수</Text>
                  <Text style={styles.detailValue}>{selectedQuote.areaSize}평</Text>
                </View>
              )}

              {selectedQuote.preferredSchedule && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>희망 일정</Text>
                  <Text style={styles.detailValue}>{selectedQuote.preferredSchedule}</Text>
                </View>
              )}

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>문의 내용</Text>
                <Text style={styles.detailValueMultiline}>{selectedQuote.description}</Text>
              </View>

              {selectedQuote.contractor && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>시공업체</Text>
                  <Text style={styles.detailValue}>
                    {selectedQuote.contractor.companyName || selectedQuote.contractor.user?.name}
                  </Text>
                </View>
              )}

              {selectedQuote.contractorResponse && (
                <View style={styles.responseSection}>
                  <Text style={styles.responseSectionTitle}>받은 견적서</Text>
                  {selectedQuote.respondedAt && (
                    <Text style={styles.responseDate}>
                      {new Date(selectedQuote.respondedAt).toLocaleDateString('ko-KR')} 답변
                    </Text>
                  )}
                  <Text style={styles.responseText}>{selectedQuote.contractorResponse}</Text>
                </View>
              )}

              {selectedQuote.contractor && selectedQuote.status === 'responded' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() => handleStartChat(selectedQuote)}>
                    <Text style={styles.chatButtonText}>시공업체와 채팅하기</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  quoteCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  respondedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  contractorText: {
    fontSize: 14,
    color: '#2196F3',
    marginTop: 4,
  },
  responsePreview: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  responsePreviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  responsePreviewText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    fontSize: 16,
    color: '#666',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailSection: {
    marginTop: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
  },
  detailValueMultiline: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  responseSection: {
    marginTop: 24,
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
  },
  responseSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  responseDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  responseText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 24,
  },
  actionButtons: {
    marginTop: 24,
  },
  chatButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 14,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
