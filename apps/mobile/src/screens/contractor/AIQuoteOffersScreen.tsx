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
import Ionicons from 'react-native-vector-icons/Ionicons';
import { aiQuotesApi, AIQuoteOffer, CostBreakdown } from '../../services/aiService';

interface AIQuoteWithDetails extends AIQuoteOffer {
  aiQuote?: {
    id: string;
    title: string;
    category: string;
    locationCity?: string;
    locationDistrict?: string;
    areaSize?: number;
    description?: string;
    totalCost: number;
    costBreakdown: CostBreakdown[];
    customer?: {
      id: string;
      name: string;
    };
  };
}

const STATUS_LABELS: Record<string, string> = {
  pending: '검토 대기',
  accepted: '수락함',
  rejected: '거절함',
  expired: '만료됨',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#FF9800',
  accepted: '#4CAF50',
  rejected: '#F44336',
  expired: '#9E9E9E',
};

export const AIQuoteOffersScreen = () => {
  const queryClient = useQueryClient();
  const [selectedOffer, setSelectedOffer] = useState<AIQuoteWithDetails | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [proposedCost, setProposedCost] = useState('');

  const { data: offers, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['aiQuoteOffers'],
    queryFn: async () => {
      const data = await aiQuotesApi.getPendingOffers();
      return data as AIQuoteWithDetails[];
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ offerId, accepted, message, cost }: {
      offerId: string;
      accepted: boolean;
      message?: string;
      cost?: number;
    }) => {
      return aiQuotesApi.respondToOffer(offerId, accepted, message, cost);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['aiQuoteOffers'] });
      setShowResponseModal(false);
      setSelectedOffer(null);
      setResponseMessage('');
      setProposedCost('');
      Alert.alert(
        '완료',
        variables.accepted ? '견적 요청을 수락했습니다. 고객과 채팅을 시작하세요!' : '견적 요청을 거절했습니다.'
      );
    },
    onError: () => {
      Alert.alert('오류', '응답 처리에 실패했습니다.');
    },
  });

  const handleAccept = () => {
    if (!selectedOffer) return;

    const cost = proposedCost ? parseInt(proposedCost.replace(/,/g, ''), 10) : undefined;
    respondMutation.mutate({
      offerId: selectedOffer.id,
      accepted: true,
      message: responseMessage || undefined,
      cost,
    });
  };

  const handleReject = () => {
    if (!selectedOffer) return;

    Alert.alert(
      '거절 확인',
      '이 견적 요청을 거절하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '거절',
          style: 'destructive',
          onPress: () => {
            respondMutation.mutate({
              offerId: selectedOffer.id,
              accepted: false,
              message: responseMessage || '죄송합니다. 현재 일정상 시공이 어렵습니다.',
            });
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatCost = (cost: number) => {
    return cost.toLocaleString() + '만원';
  };

  const renderOfferItem = ({ item }: { item: AIQuoteWithDetails }) => (
    <TouchableOpacity
      style={[styles.offerCard, item.status === 'pending' && styles.pendingCard]}
      onPress={() => setSelectedOffer(item)}>
      <View style={styles.offerHeader}>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] }]}>
          <Text style={styles.statusText}>{STATUS_LABELS[item.status]}</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(item.createdAt || new Date().toISOString())}</Text>
      </View>

      {item.aiQuote && (
        <>
          <Text style={styles.titleText}>{item.aiQuote.title}</Text>
          <Text style={styles.categoryText}>{item.aiQuote.category}</Text>
          <Text style={styles.locationText}>
            {item.aiQuote.locationCity} {item.aiQuote.locationDistrict}
            {item.aiQuote.areaSize ? ` · ${item.aiQuote.areaSize}평` : ''}
          </Text>
          <View style={styles.costContainer}>
            <Ionicons name="cash-outline" size={16} color="#FF9800" />
            <Text style={styles.costText}>{formatCost(item.aiQuote.totalCost)}</Text>
          </View>
        </>
      )}

      {item.status === 'pending' && (
        <View style={styles.actionHint}>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </View>
      )}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF9800" />
        </View>
      </SafeAreaView>
    );
  }

  const pendingCount = offers?.filter(o => o.status === 'pending').length || 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Ionicons name="flash" size={24} color="#FF9800" />
          <Text style={styles.headerTitle}>AI 견적 요청</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {pendingCount > 0 ? `${pendingCount}건의 새 요청` : '새로운 요청이 없습니다'}
        </Text>
      </View>

      <FlatList
        data={offers}
        keyExtractor={(item) => item.id}
        renderItem={renderOfferItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>AI 견적 요청이 없습니다</Text>
            <Text style={styles.emptySubtext}>
              고객이 AI 김 반장을 통해 견적서를 보내면{'\n'}
              여기에서 확인하고 응답할 수 있습니다
            </Text>
          </View>
        }
      />

      {/* Offer Detail Modal */}
      <Modal
        visible={!!selectedOffer}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedOffer(null)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedOffer(null)}>
              <Text style={styles.closeButton}>닫기</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>AI 견적 상세</Text>
            <View style={{ width: 40 }} />
          </View>

          {selectedOffer?.aiQuote && (
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <ScrollView style={styles.modalContent}>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selectedOffer.status], alignSelf: 'flex-start' }]}>
                  <Text style={styles.statusText}>{STATUS_LABELS[selectedOffer.status]}</Text>
                </View>

                <Text style={styles.detailTitle}>{selectedOffer.aiQuote.title}</Text>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>카테고리</Text>
                  <Text style={styles.detailValue}>{selectedOffer.aiQuote.category}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>지역</Text>
                  <Text style={styles.detailValue}>
                    {selectedOffer.aiQuote.locationCity} {selectedOffer.aiQuote.locationDistrict}
                  </Text>
                </View>

                {selectedOffer.aiQuote.areaSize && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>평수</Text>
                    <Text style={styles.detailValue}>{selectedOffer.aiQuote.areaSize}평</Text>
                  </View>
                )}

                {selectedOffer.aiQuote.description && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>설명</Text>
                    <Text style={styles.detailValueMultiline}>{selectedOffer.aiQuote.description}</Text>
                  </View>
                )}

                {/* Cost Breakdown */}
                <View style={styles.costBreakdownSection}>
                  <Text style={styles.costBreakdownTitle}>예상 비용 내역 (단위: 만원)</Text>
                  <View style={styles.costTable}>
                    <View style={styles.costTableHeader}>
                      <Text style={[styles.costTableCell, styles.costTableHeaderText, { flex: 2 }]}>항목</Text>
                      <Text style={[styles.costTableCell, styles.costTableHeaderText]}>재료비</Text>
                      <Text style={[styles.costTableCell, styles.costTableHeaderText]}>노무비</Text>
                      <Text style={[styles.costTableCell, styles.costTableHeaderText]}>경비</Text>
                      <Text style={[styles.costTableCell, styles.costTableHeaderText]}>합계</Text>
                    </View>
                    {selectedOffer.aiQuote.costBreakdown.map((item, index) => (
                      <View key={index} style={styles.costTableRow}>
                        <Text style={[styles.costTableCell, { flex: 2 }]}>{item.category}</Text>
                        <Text style={styles.costTableCell}>{item.dm}</Text>
                        <Text style={styles.costTableCell}>{item.dl}</Text>
                        <Text style={styles.costTableCell}>{item.oh}</Text>
                        <Text style={[styles.costTableCell, styles.totalCostCell]}>{item.total}</Text>
                      </View>
                    ))}
                    <View style={[styles.costTableRow, styles.costTableTotalRow]}>
                      <Text style={[styles.costTableCell, styles.totalCostCell, { flex: 2 }]}>총 합계</Text>
                      <Text style={styles.costTableCell} />
                      <Text style={styles.costTableCell} />
                      <Text style={styles.costTableCell} />
                      <Text style={[styles.costTableCell, styles.totalCostCell]}>
                        {selectedOffer.aiQuote.totalCost}
                      </Text>
                    </View>
                  </View>
                </View>

                {selectedOffer.status === 'pending' && (
                  <>
                    {/* Response Form */}
                    <View style={styles.responseSection}>
                      <Text style={styles.responseSectionTitle}>응답 작성</Text>

                      <View style={styles.formSection}>
                        <Text style={styles.formLabel}>제안 금액 (선택)</Text>
                        <TextInput
                          style={styles.formInput}
                          value={proposedCost}
                          onChangeText={setProposedCost}
                          placeholder="예: 2,800 (만원 단위)"
                          placeholderTextColor="#999"
                          keyboardType="numeric"
                        />
                      </View>

                      <View style={styles.formSection}>
                        <Text style={styles.formLabel}>메시지 (선택)</Text>
                        <TextInput
                          style={[styles.formInput, styles.formTextArea]}
                          value={responseMessage}
                          onChangeText={setResponseMessage}
                          placeholder="고객에게 전달할 메시지를 작성해주세요"
                          placeholderTextColor="#999"
                          multiline
                          numberOfLines={4}
                          textAlignVertical="top"
                        />
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={handleAccept}
                        disabled={respondMutation.isPending}>
                        {respondMutation.isPending ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            <Text style={styles.acceptButtonText}>수락하기</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={handleReject}
                        disabled={respondMutation.isPending}>
                        <Ionicons name="close-circle" size={20} color="#F44336" />
                        <Text style={styles.rejectButtonText}>거절하기</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {selectedOffer.status === 'accepted' && selectedOffer.chatRoomId && (
                  <TouchableOpacity style={styles.chatButton}>
                    <Ionicons name="chatbubbles" size={20} color="#fff" />
                    <Text style={styles.chatButtonText}>채팅하기</Text>
                  </TouchableOpacity>
                )}

                <View style={{ height: 40 }} />
              </ScrollView>
            </KeyboardAvoidingView>
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
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FF9800',
    marginTop: 4,
    marginLeft: 32,
  },
  listContent: {
    padding: 16,
  },
  offerCard: {
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
  pendingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  offerHeader: {
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
  titleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
  },
  costContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  costText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF9800',
  },
  actionHint: {
    position: 'absolute',
    right: 16,
    top: '50%',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
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
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 16,
  },
  detailSection: {
    marginBottom: 16,
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
  costBreakdownSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  costBreakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  costTable: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  costTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  costTableHeaderText: {
    fontWeight: '600',
    color: '#666',
  },
  costTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  costTableTotalRow: {
    backgroundColor: '#FFF3E0',
  },
  costTableCell: {
    flex: 1,
    padding: 10,
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
  },
  totalCostCell: {
    fontWeight: '700',
    color: '#E65100',
  },
  responseSection: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  responseSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  formSection: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  actionButtons: {
    marginTop: 24,
    gap: 12,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F44336',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  rejectButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    marginTop: 24,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
