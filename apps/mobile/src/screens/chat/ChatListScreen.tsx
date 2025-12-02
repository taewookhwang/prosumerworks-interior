import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';

interface ChatRoom {
  id: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  otherUser: {
    id: string;
    name: string;
    profileImage: string | null;
  };
  unreadCount: number;
}

export const ChatListScreen = () => {
  const navigation = useNavigation<any>();

  const { data: chatRooms, isLoading, refetch } = useQuery({
    queryKey: ['chatRooms'],
    queryFn: async () => {
      const response = await api.get('/chat/rooms');
      return response.data as ChatRoom[];
    },
  });

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return '어제';
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    }
  };

  const renderItem = ({ item }: { item: ChatRoom }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() =>
        navigation.navigate('ChatRoom', {
          roomId: item.id,
          recipientName: item.otherUser.name,
        })
      }>
      <View style={styles.avatarContainer}>
        {item.otherUser.profileImage ? (
          <Image
            source={{ uri: item.otherUser.profileImage }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {item.otherUser.name?.charAt(0) || '?'}
            </Text>
          </View>
        )}
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName} numberOfLines={1}>
            {item.otherUser.name}
          </Text>
          <Text style={styles.chatTime}>{formatTime(item.lastMessageAt)}</Text>
        </View>
        <Text
          style={[
            styles.chatMessage,
            item.unreadCount > 0 && styles.chatMessageUnread,
          ]}
          numberOfLines={2}>
          {item.lastMessage || '새로운 대화를 시작해보세요'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>채팅</Text>
      </View>

      <FlatList
        data={chatRooms || []}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyTitle}>아직 채팅이 없습니다</Text>
            <Text style={styles.emptySubtitle}>
              견적 요청에서 채팅을 시작해보세요
            </Text>
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
  listContent: {
    flexGrow: 1,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f5f5f5',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2196F3',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF5252',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 12,
    color: '#999',
  },
  chatMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  chatMessageUnread: {
    color: '#333',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
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
  },
});
