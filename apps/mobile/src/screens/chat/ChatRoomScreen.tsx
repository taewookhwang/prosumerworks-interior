import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import api from '../../services/api';
import { useAuthStore } from '../../store/auth';
import type { RootStackParamList } from '../../navigation/types';

type RouteProps = RouteProp<RootStackParamList, 'ChatRoom'>;

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    profileImage: string | null;
  };
}

export const ChatRoomScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProps>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const flatListRef = useRef<FlatList>(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const { roomId, recipientName } = route.params;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['chatMessages', roomId],
    queryFn: async () => {
      const response = await api.get(`/chat/rooms/${roomId}/messages`);
      return response.data;
    },
    refetchInterval: 3000, // Poll every 3 seconds
  });

  const messages = data?.messages || [];

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await api.post(`/chat/rooms/${roomId}/messages`, {
        content,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', roomId] });
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
    },
  });

  const handleSend = async () => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendMutation.mutateAsync(message.trim());
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: recipientName,
      headerBackTitle: '뒤로',
    });
  }, [navigation, recipientName]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMyMessage = item.senderId === user?.id;
    const showDate =
      index === 0 ||
      new Date(messages[index - 1].createdAt).toDateString() !==
        new Date(item.createdAt).toDateString();

    return (
      <View>
        {showDate && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>
              {new Date(item.createdAt).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.messageContainer,
            isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
          ]}>
          <View
            style={[
              styles.messageBubble,
              isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
            ]}>
            <Text
              style={[
                styles.messageText,
                isMyMessage ? styles.myMessageText : styles.otherMessageText,
              ]}>
              {item.content}
            </Text>
          </View>
          <Text style={styles.messageTime}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {recipientName}님과의 대화를 시작해보세요
              </Text>
            </View>
          }
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="메시지를 입력하세요"
            placeholderTextColor="#999"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!message.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!message.trim() || isSending}>
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>전송</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    padding: 16,
    flexGrow: 1,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '100%',
  },
  myMessageBubble: {
    backgroundColor: '#2196F3',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
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
    backgroundColor: '#2196F3',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
