import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import aiService, { AgentResponse, CostEstimate, ProjectSchedule, QuoteData, aiQuotesApi } from '../../services/aiService';
import { useAuthStore } from '../../store/auth';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: CostEstimate | ProjectSchedule | QuoteData | Record<string, unknown>;
  intent?: string;
  followUpQuestions?: string[];
  quoteStatus?: 'pending' | 'sending' | 'sent' | 'error';
  quoteSentCount?: number;
}

const STORAGE_KEY_PREFIX = 'ai_chat_messages_';

const createWelcomeMessage = (): ChatMessage => ({
  id: '0',
  role: 'assistant',
  content: '안녕하세요! 저는 김 반장입니다. 20년 경력의 인테리어 현장 소장으로서 비용 견적, 일정 계획, 기술 상담 등 인테리어에 관한 모든 것을 도와드립니다.\n\n무엇을 도와드릴까요?',
  timestamp: new Date(),
  followUpQuestions: [
    '32평 아파트 전체 인테리어 비용은?',
    '욕실 리모델링 일정을 잡아주세요',
    '방수 공사 주의사항이 뭔가요?',
  ],
});

export const AIChatScreen = () => {
  const flatListRef = useRef<FlatList>(null);
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([createWelcomeMessage()]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Storage key based on user ID
  const storageKey = `${STORAGE_KEY_PREFIX}${user?.id || 'guest'}`;

  // Load messages from AsyncStorage on mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Restore Date objects from ISO strings
          const restoredMessages = parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(restoredMessages);
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadMessages();
  }, [storageKey]);

  // Save messages to AsyncStorage when they change
  useEffect(() => {
    const saveMessages = async () => {
      // Skip saving during initial load
      if (isLoadingHistory) return;

      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(messages));
      } catch (error) {
        console.error('Failed to save chat history:', error);
      }
    };

    saveMessages();
  }, [messages, storageKey, isLoadingHistory]);

  // Helper function to find the last cost estimate from messages
  const findLastCostEstimate = useCallback((msgs: ChatMessage[]) => {
    for (let i = msgs.length - 1; i >= 0; i--) {
      const msg = msgs[i];
      if (msg.intent === 'cost' && msg.data && 'breakdown' in msg.data) {
        return msg.data;
      }
    }
    return null;
  }, []);

  // Build conversation context for the AI
  const buildContext = useCallback((msgs: ChatMessage[]) => {
    const context: Record<string, unknown> = {};

    // Find the last cost estimate
    const lastCostEstimate = findLastCostEstimate(msgs);
    if (lastCostEstimate) {
      context.previous_cost_estimate = lastCostEstimate;
    }

    // Build conversation summary for context
    const recentMessages = msgs.slice(-10); // Last 10 messages
    const conversationSummary = recentMessages
      .filter(m => m.role === 'assistant' && m.data)
      .map(m => ({
        intent: m.intent,
        hasData: !!m.data,
        dataType: m.data && 'breakdown' in m.data ? 'cost' :
                  m.data && 'phases' in m.data ? 'schedule' : 'other'
      }));

    if (conversationSummary.length > 0) {
      context.conversation_history = conversationSummary;
    }

    return Object.keys(context).length > 0 ? context : undefined;
  }, [findLastCostEstimate]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Build context from previous messages including cost estimates
      const context = buildContext(messages);
      const response: AgentResponse = await aiService.chat(text.trim(), context);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        data: response.data,
        intent: response.intent,
        followUpQuestions: response.followUpQuestions,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      console.error('AI Chat Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, buildContext]);

  const handleSend = () => {
    sendMessage(inputText);
  };

  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSendQuoteToContractors = useCallback(async (messageId: string, quoteData: QuoteData) => {
    // Update message status to sending
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, quoteStatus: 'sending' as const } : msg
    ));

    try {
      // Create the quote in the database
      const createdQuote = await aiQuotesApi.create(quoteData);

      // Send to contractors
      const result = await aiQuotesApi.sendToContractors(createdQuote.id);

      // Update message status to sent
      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? {
          ...msg,
          quoteStatus: 'sent' as const,
          quoteSentCount: result.sent_count
        } : msg
      ));

      // Add success message from AI
      const successMessage: ChatMessage = {
        id: (Date.now()).toString(),
        role: 'assistant',
        content: `견적서를 ${result.sent_count}개 업체에 전송했습니다! 업체들의 응답이 오면 알려드릴게요. 내 견적서 메뉴에서 응답을 확인하실 수 있습니다.`,
        timestamp: new Date(),
        followUpQuestions: ['내 견적서 목록 보기', '다른 견적 상담하기'],
      };
      setMessages(prev => [...prev, successMessage]);

    } catch (error: any) {
      console.error('Send quote error:', error);
      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, quoteStatus: 'error' as const } : msg
      ));

      Alert.alert(
        '전송 실패',
        '견적서 전송 중 오류가 발생했습니다. 다시 시도해주세요.',
        [{ text: '확인' }]
      );
    }
  }, []);

  const renderCostTable = (data: CostEstimate) => {
    return (
      <View style={styles.tableContainer}>
        <Text style={styles.tableTitle}>비용 견적 (단위: 만원)</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.headerCell, { flex: 2 }]}>항목</Text>
            <Text style={[styles.tableCell, styles.headerCell]}>재료비</Text>
            <Text style={[styles.tableCell, styles.headerCell]}>노무비</Text>
            <Text style={[styles.tableCell, styles.headerCell]}>경비</Text>
            <Text style={[styles.tableCell, styles.headerCell]}>합계</Text>
          </View>
          {data.breakdown.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{item.category}</Text>
              <Text style={styles.tableCell}>{item.dm}</Text>
              <Text style={styles.tableCell}>{item.dl}</Text>
              <Text style={styles.tableCell}>{item.oh}</Text>
              <Text style={[styles.tableCell, styles.totalCell]}>{item.total}</Text>
            </View>
          ))}
          <View style={[styles.tableRow, styles.totalRow]}>
            <Text style={[styles.tableCell, styles.totalCell, { flex: 2 }]}>총 합계</Text>
            <Text style={[styles.tableCell, styles.totalCell]} />
            <Text style={[styles.tableCell, styles.totalCell]} />
            <Text style={[styles.tableCell, styles.totalCell]} />
            <Text style={[styles.tableCell, styles.totalCell]}>{data.totalCost}</Text>
          </View>
        </View>
        {data.notes && (
          <Text style={styles.tableNotes}>{data.notes}</Text>
        )}
      </View>
    );
  };

  const renderScheduleTable = (data: ProjectSchedule) => {
    return (
      <View style={styles.tableContainer}>
        <Text style={styles.tableTitle}>{data.projectName} - 공정표</Text>
        <Text style={styles.scheduleInfo}>
          기간: {data.startDate} ~ {data.endDate} (총 {data.totalDuration}일)
        </Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.headerCell, { flex: 2 }]}>공정</Text>
            <Text style={[styles.tableCell, styles.headerCell]}>시작일</Text>
            <Text style={[styles.tableCell, styles.headerCell]}>종료일</Text>
            <Text style={[styles.tableCell, styles.headerCell]}>기간</Text>
          </View>
          {data.phases.map((phase, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{phase.phase}</Text>
              <Text style={styles.tableCell}>{phase.startDate}</Text>
              <Text style={styles.tableCell}>{phase.endDate}</Text>
              <Text style={styles.tableCell}>{phase.duration}일</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderQuoteCard = (message: ChatMessage, data: QuoteData) => {
    const totalCost = data.breakdown.reduce((sum, item) => sum + item.total, 0);

    return (
      <View style={styles.quoteCard}>
        <View style={styles.quoteHeader}>
          <Ionicons name="document-text" size={20} color="#FF9800" />
          <Text style={styles.quoteTitle}>{data.title}</Text>
        </View>

        <View style={styles.quoteInfo}>
          <Text style={styles.quoteCategory}>{data.category}</Text>
          {data.areaSize && (
            <Text style={styles.quoteDetail}>{data.areaSize}평</Text>
          )}
          {(data.locationCity || data.locationDistrict) && (
            <Text style={styles.quoteDetail}>
              {data.locationCity} {data.locationDistrict}
            </Text>
          )}
        </View>

        {data.description && (
          <Text style={styles.quoteDescription}>{data.description}</Text>
        )}

        {/* Cost Breakdown Table */}
        <View style={styles.quoteTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.headerCell, { flex: 2 }]}>항목</Text>
            <Text style={[styles.tableCell, styles.headerCell]}>재료비</Text>
            <Text style={[styles.tableCell, styles.headerCell]}>노무비</Text>
            <Text style={[styles.tableCell, styles.headerCell]}>경비</Text>
            <Text style={[styles.tableCell, styles.headerCell]}>합계</Text>
          </View>
          {data.breakdown.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{item.category}</Text>
              <Text style={styles.tableCell}>{item.dm}</Text>
              <Text style={styles.tableCell}>{item.dl}</Text>
              <Text style={styles.tableCell}>{item.oh}</Text>
              <Text style={[styles.tableCell, styles.totalCell]}>{item.total}</Text>
            </View>
          ))}
          <View style={[styles.tableRow, styles.totalRow]}>
            <Text style={[styles.tableCell, styles.totalCell, { flex: 2 }]}>총 합계</Text>
            <Text style={[styles.tableCell, styles.totalCell]} />
            <Text style={[styles.tableCell, styles.totalCell]} />
            <Text style={[styles.tableCell, styles.totalCell]} />
            <Text style={[styles.tableCell, styles.totalCell]}>{totalCost}만원</Text>
          </View>
        </View>

        {/* Send Button / Status */}
        <View style={styles.quoteActions}>
          {message.quoteStatus === 'sent' ? (
            <View style={styles.quoteSentBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.quoteSentText}>
                {message.quoteSentCount}개 업체에 전송됨
              </Text>
            </View>
          ) : message.quoteStatus === 'sending' ? (
            <View style={styles.quoteSendingContainer}>
              <ActivityIndicator size="small" color="#FF9800" />
              <Text style={styles.quoteSendingText}>업체 검색 및 전송 중...</Text>
            </View>
          ) : message.quoteStatus === 'error' ? (
            <TouchableOpacity
              style={styles.quoteSendButton}
              onPress={() => handleSendQuoteToContractors(message.id, data)}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.quoteSendButtonText}>다시 시도</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.quoteSendButton}
              onPress={() => handleSendQuoteToContractors(message.id, data)}>
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.quoteSendButtonText}>업체에 견적 보내기</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';

    return (
      <View style={styles.messageWrapper}>
        <View
          style={[
            styles.messageContainer,
            isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
          ]}>
          {!isUser && (
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>KIM</Text>
              </View>
            </View>
          )}
          <View style={styles.messageContent}>
            {!isUser && (
              <Text style={styles.senderName}>김 반장</Text>
            )}
            <View
              style={[
                styles.messageBubble,
                isUser ? styles.userBubble : styles.assistantBubble,
              ]}>
              <Text
                style={[
                  styles.messageText,
                  isUser ? styles.userMessageText : styles.assistantMessageText,
                ]}>
                {item.content}
              </Text>
            </View>

            {/* Cost Estimate Table */}
            {item.data && 'breakdown' in item.data && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {renderCostTable(item.data as CostEstimate)}
              </ScrollView>
            )}

            {/* Schedule Table */}
            {item.data && 'phases' in item.data && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {renderScheduleTable(item.data as ProjectSchedule)}
              </ScrollView>
            )}

            {/* Quote Card - for quote_send intent */}
            {item.intent === 'quote_send' && item.data && 'title' in item.data && 'breakdown' in item.data && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {renderQuoteCard(item, item.data as QuoteData)}
              </ScrollView>
            )}

            {/* Follow-up Questions */}
            {item.followUpQuestions && item.followUpQuestions.length > 0 && (
              <View style={styles.followUpContainer}>
                {item.followUpQuestions.map((question, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.followUpButton}
                    onPress={() => handleQuickQuestion(question)}>
                    <Text style={styles.followUpText}>{question}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>KIM</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>김 반장</Text>
            <Text style={styles.headerSubtitle}>AI 인테리어 현장 소장</Text>
          </View>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="hardware-chip" size={14} color="#4CAF50" />
          <Text style={styles.headerBadgeText}>AI</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        {isLoadingHistory ? (
          <View style={styles.historyLoadingContainer}>
            <ActivityIndicator size="large" color="#FF9800" />
            <Text style={styles.historyLoadingText}>대화 내용을 불러오는 중...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
          />
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color="#FF9800" />
              <Text style={styles.loadingText}>김 반장이 답변 중...</Text>
            </View>
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="인테리어에 대해 물어보세요..."
            placeholderTextColor="#999"
            multiline
            maxLength={500}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}>
            <Ionicons
              name="send"
              size={20}
              color={!inputText.trim() || isLoading ? '#999' : '#fff'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerAvatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 4,
  },
  chatContainer: {
    flex: 1,
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageWrapper: {
    marginBottom: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    maxWidth: '90%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  assistantMessageContainer: {
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 10,
  },
  messageContent: {
    flex: 1,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#FF9800',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  followUpContainer: {
    marginTop: 12,
  },
  followUpButton: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  followUpText: {
    fontSize: 13,
    color: '#E65100',
  },
  tableContainer: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    minWidth: 320,
  },
  tableTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  scheduleInfo: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  table: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  totalRow: {
    backgroundColor: '#FFF3E0',
  },
  tableCell: {
    flex: 1,
    padding: 8,
    fontSize: 11,
    textAlign: 'center',
    color: '#333',
  },
  headerCell: {
    fontWeight: '600',
    color: '#666',
  },
  totalCell: {
    fontWeight: '700',
    color: '#E65100',
  },
  tableNotes: {
    fontSize: 11,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  loadingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  loadingText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  historyLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyLoadingText: {
    fontSize: 15,
    color: '#666',
    marginTop: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#FF9800',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  // Quote Card Styles
  quoteCard: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    minWidth: 320,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  quoteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  quoteInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 8,
  },
  quoteCategory: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
    color: '#E65100',
    overflow: 'hidden',
  },
  quoteDetail: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    color: '#666',
    overflow: 'hidden',
  },
  quoteDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    lineHeight: 18,
  },
  quoteTable: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 12,
  },
  quoteActions: {
    marginTop: 4,
  },
  quoteSendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    gap: 8,
  },
  quoteSendButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  quoteSentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  quoteSentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
  },
  quoteSendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  quoteSendingText: {
    fontSize: 14,
    color: '#666',
  },
});
