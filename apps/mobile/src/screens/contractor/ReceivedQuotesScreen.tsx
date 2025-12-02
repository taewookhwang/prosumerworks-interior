import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

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
  createdAt: string;
  customerId?: string;
  customer?: {
    id: string;
    name: string;
    profileImage?: string;
  };
}

interface QuoteResponse {
  estimatedCost: string;
  estimatedDuration: string;
  availableDate: string;
  workScope: string;
  additionalNotes: string;
}

const STATUS_LABELS: Record<QuoteStatus, string> = {
  pending: '새 문의',
  viewed: '확인함',
  responded: '답변완료',
  completed: '완료',
  cancelled: '취소됨',
};

const STATUS_COLORS: Record<QuoteStatus, string> = {
  pending: '#FF5722',
  viewed: '#FF9800',
  responded: '#4CAF50',
  completed: '#2196F3',
  cancelled: '#9E9E9E',
};

const initialResponseForm: QuoteResponse = {
  estimatedCost: '',
  estimatedDuration: '',
  availableDate: '',
  workScope: '',
  additionalNotes: '',
};

export const ReceivedQuotesScreen = () => {
  const queryClient = useQueryClient();
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseForm, setResponseForm] = useState<QuoteResponse>(initialResponseForm);

  const { data: quotes, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['receivedQuotes'],
    queryFn: async () => {
      const response = await api.get('/quotes/received');
      return response.data as Quote[];
    },
  });

  const markAsViewedMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      await api.patch(`/quotes/${quoteId}/view`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivedQuotes'] });
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ quoteId, response }: { quoteId: string; response: string }) => {
      await api.patch(`/quotes/${quoteId}/respond`, { response });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivedQuotes'] });
      setShowResponseModal(false);
      setSelectedQuote(null);
      setResponseForm(initialResponseForm);
      Alert.alert('완료', '견적서가 전송되었습니다.');
    },
    onError: () => {
      Alert.alert('오류', '견적서 전송에 실패했습니다.');
    },
  });

  const handleQuotePress = (quote: Quote) => {
    setSelectedQuote(quote);
    if (quote.status === 'pending') {
      markAsViewedMutation.mutate(quote.id);
    }
  };

  const formatResponseToText = (form: QuoteResponse): string => {
    const lines = [
      '=== 견적서 ===',
      '',
      `[예상 비용] ${form.estimatedCost}`,
      `[예상 공사기간] ${form.estimatedDuration}`,
      `[착수 가능일] ${form.availableDate}`,
      '',
      '[시공 범위]',
      form.workScope,
      '',
    ];

    if (form.additionalNotes.trim()) {
      lines.push('[추가 안내사항]', form.additionalNotes);
    }

    return lines.join('\n');
  };

  const handleRespond = () => {
    if (!responseForm.estimatedCost.trim()) {
      Alert.alert('알림', '예상 비용을 입력해주세요.');
      return;
    }
    if (!responseForm.estimatedDuration.trim()) {
      Alert.alert('알림', '예상 공사기간을 입력해주세요.');
      return;
    }
    if (!responseForm.workScope.trim()) {
      Alert.alert('알림', '시공 범위를 입력해주세요.');
      return;
    }

    if (selectedQuote) {
      const responseText = formatResponseToText(responseForm);
      respondMutation.mutate({
        quoteId: selectedQuote.id,
        response: responseText,
      });
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
      style={[styles.quoteCard, item.status === 'pending' && styles.newQuoteCard]}
      onPress={() => handleQuotePress(item)}>
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

      <Text style={styles.descriptionText} numberOfLines={2}>
        {item.description}
      </Text>

      {item.customer && (
        <Text style={styles.customerText}>문의자: {item.customer.name}</Text>
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
        <Text style={styles.headerTitle}>받은 견적요청</Text>
        <Text style={styles.headerSubtitle}>
          {quotes?.filter(q => q.status === 'pending').length || 0}건의 새 문의
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
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>받은 견적요청이 없습니다</Text>
            <Text style={styles.emptySubtext}>
              포트폴리오를 등록하면 고객들의 견적요청을 받을 수 있습니다
            </Text>
          </View>
        }
      />

      {/* Quote Detail Modal */}
      <Modal
        visible={!!selectedQuote && !showResponseModal}
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
                <Text style={styles.detailLabel}>연락처</Text>
                <Text style={styles.detailValue}>{selectedQuote.contactPhone}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>문의 내용</Text>
                <Text style={styles.detailValueMultiline}>{selectedQuote.description}</Text>
              </View>

              {selectedQuote.contractorResponse && (
                <View style={styles.responseSection}>
                  <Text style={styles.responseSectionTitle}>보낸 견적서</Text>
                  <Text style={styles.detailValueMultiline}>{selectedQuote.contractorResponse}</Text>
                </View>
              )}

              <View style={styles.actionButtons}>
                {selectedQuote.status !== 'responded' && selectedQuote.status !== 'completed' && (
                  <TouchableOpacity
                    style={styles.respondButton}
                    onPress={() => {
                      console.log('견적서 작성 버튼 클릭됨');
                      // 첫 번째 모달을 먼저 닫지 않고 바로 Response Modal 열기
                      setShowResponseModal(true);
                    }}
                    activeOpacity={0.7}>
                    <Text style={styles.respondButtonText}>견적서 작성</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Response Form Modal */}
      <Modal
        visible={showResponseModal && !!selectedQuote}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowResponseModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowResponseModal(false)}>
              <Text style={styles.closeButton}>취소</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>견적서 작성</Text>
            <TouchableOpacity onPress={handleRespond} disabled={respondMutation.isPending}>
              <Text style={[styles.sendButton, respondMutation.isPending && styles.sendButtonDisabled]}>
                {respondMutation.isPending ? '전송중...' : '전송'}
              </Text>
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              <Text style={styles.formDescription}>
                고객에게 전송할 견적서를 작성해주세요.
              </Text>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>예상 비용 *</Text>
                <TextInput
                  style={styles.formInput}
                  value={responseForm.estimatedCost}
                  onChangeText={(text) => setResponseForm(prev => ({ ...prev, estimatedCost: text }))}
                  placeholder="예: 3,500만원 ~ 4,000만원"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>예상 공사기간 *</Text>
                <TextInput
                  style={styles.formInput}
                  value={responseForm.estimatedDuration}
                  onChangeText={(text) => setResponseForm(prev => ({ ...prev, estimatedDuration: text }))}
                  placeholder="예: 약 4주 (착공 후 30일)"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>착수 가능일</Text>
                <TextInput
                  style={styles.formInput}
                  value={responseForm.availableDate}
                  onChangeText={(text) => setResponseForm(prev => ({ ...prev, availableDate: text }))}
                  placeholder="예: 2024년 4월 첫째 주부터"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>시공 범위 *</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={responseForm.workScope}
                  onChangeText={(text) => setResponseForm(prev => ({ ...prev, workScope: text }))}
                  placeholder="포함되는 시공 내용을 상세히 작성해주세요&#10;예:&#10;- 바닥: LVT 전체 교체&#10;- 벽체: 도배 전체&#10;- 주방: 싱크대 및 상판 교체"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>추가 안내사항</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={responseForm.additionalNotes}
                  onChangeText={(text) => setResponseForm(prev => ({ ...prev, additionalNotes: text }))}
                  placeholder="자재 등급, 결제 조건, 무상 AS 기간 등 안내사항을 작성해주세요"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={{ height: 100 }} />
            </ScrollView>
          </KeyboardAvoidingView>
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
    color: '#FF5722',
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
  newQuoteCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF5722',
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
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  customerText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
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
  sendButton: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  sendButtonDisabled: {
    color: '#999',
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
    marginTop: 20,
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
  },
  responseSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 12,
  },
  actionButtons: {
    marginTop: 24,
    gap: 12,
    zIndex: 10,
  },
  respondButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 14,
  },
  respondButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  formDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  formTextArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
});
