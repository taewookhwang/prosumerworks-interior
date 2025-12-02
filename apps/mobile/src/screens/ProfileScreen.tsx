import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../store/auth';
import { authService } from '../services/auth';

export const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { user, logout, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  // Fetch latest user info on mount
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const updatedUser = await authService.getMe();
        setUser(updatedUser);
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      }
    };
    fetchUserInfo();
  }, [setUser]);

  const handleLogout = async () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          setIsLoading(true);
          try {
            await authService.signOut();
            logout();
          } catch (error) {
            console.error('Logout error:', error);
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  const handleSwitchToContractor = async () => {
    // If user has already registered as contractor, just switch
    if (user?.hasContractor) {
      Alert.alert(
        '업체 회원 전환',
        `${user.contractor?.companyName}(으)로 전환하시겠습니까?`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '전환하기',
            onPress: async () => {
              setIsSwitching(true);
              try {
                const updatedUser = await authService.switchUserType('contractor');
                setUser(updatedUser);
                // RootNavigator will automatically switch based on userType
              } catch (error: any) {
                Alert.alert('오류', error.response?.data?.message || '전환에 실패했습니다.');
              } finally {
                setIsSwitching(false);
              }
            },
          },
        ],
      );
    } else {
      // User needs to register as contractor first
      Alert.alert(
        '업체 회원 등록',
        '시공업체로 등록하면 포트폴리오를 올리고 고객을 만날 수 있습니다.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '업체 등록하기',
            onPress: () => navigation.navigate('ContractorRegister'),
          },
        ],
      );
    }
  };

  const handleSwitchToCustomer = async () => {
    Alert.alert(
      '일반 회원 전환',
      '일반 회원으로 전환하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '전환하기',
          onPress: async () => {
            setIsSwitching(true);
            try {
              const updatedUser = await authService.switchUserType('customer');
              setUser(updatedUser);
              // RootNavigator will automatically switch based on userType
            } catch (error: any) {
              Alert.alert('오류', error.response?.data?.message || '전환에 실패했습니다.');
            } finally {
              setIsSwitching(false);
            }
          },
        },
      ],
    );
  };

  const navigateToSaved = () => {
    // Use getParent to navigate to sibling tab
    navigation.getParent()?.navigate('Saved');
  };

  const navigateToMyQuotes = () => {
    // Use getParent to navigate to sibling tab
    navigation.getParent()?.navigate('MyQuotes');
  };

  const isContractor = user?.userType === 'contractor';

  if (isLoading || isSwitching) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>
            {isSwitching ? '전환 중...' : '로그아웃 중...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>마이페이지</Text>
      </View>

      <ScrollView>
        <View style={styles.profileSection}>
          {user?.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{user?.name?.[0] || '?'}</Text>
            </View>
          )}
          <Text style={styles.name}>{user?.name || '사용자'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={[styles.badge, isContractor && styles.badgeContractor]}>
            <Text style={[styles.badgeText, isContractor && styles.badgeTextContractor]}>
              {isContractor ? '업체 회원' : '일반 회원'}
            </Text>
          </View>
          {isContractor && user?.contractor && (
            <Text style={styles.companyName}>{user.contractor.companyName}</Text>
          )}
        </View>

        <View style={styles.menuSection}>
          {/* Switch user type */}
          {!isContractor ? (
            <TouchableOpacity style={styles.menuItem} onPress={handleSwitchToContractor}>
              <View style={styles.menuLeft}>
                <Ionicons name="construct-outline" size={22} color="#262626" style={styles.menuIcon} />
                <View>
                  <Text style={styles.menuText}>
                    {user?.hasContractor ? '업체 회원으로 전환' : '업체 회원 등록'}
                  </Text>
                  <Text style={styles.menuSubtext}>
                    {user?.hasContractor
                      ? `${user.contractor?.companyName}(으)로 전환`
                      : '시공업체로 등록하고 고객을 만나세요'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#c7c7c7" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.menuItem} onPress={handleSwitchToCustomer}>
              <View style={styles.menuLeft}>
                <Ionicons name="home-outline" size={22} color="#262626" style={styles.menuIcon} />
                <View>
                  <Text style={styles.menuText}>일반 회원으로 전환</Text>
                  <Text style={styles.menuSubtext}>고객 모드로 전환합니다</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#c7c7c7" />
            </TouchableOpacity>
          )}

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('ProfileSettings')}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="settings-outline" size={22} color="#262626" style={styles.menuIcon} />
              <Text style={styles.menuText}>프로필 설정</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#c7c7c7" />
          </TouchableOpacity>

          {isContractor && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('ContractorProfileEdit')}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="business-outline" size={22} color="#262626" style={styles.menuIcon} />
                <View>
                  <Text style={styles.menuText}>업체 프로필 수정</Text>
                  <Text style={styles.menuSubtext}>업체 소개, 경력, 대표 이미지 설정</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#c7c7c7" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.menuItem} onPress={navigateToSaved}>
            <View style={styles.menuLeft}>
              <Ionicons name="bookmark-outline" size={22} color="#262626" style={styles.menuIcon} />
              <Text style={styles.menuText}>저장한 포트폴리오</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#c7c7c7" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={navigateToMyQuotes}>
            <View style={styles.menuLeft}>
              <Ionicons name="document-text-outline" size={22} color="#262626" style={styles.menuIcon} />
              <Text style={styles.menuText}>견적 요청 내역</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#c7c7c7" />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="notifications-outline" size={22} color="#262626" style={styles.menuIcon} />
              <Text style={styles.menuText}>알림 설정</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#c7c7c7" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="headset-outline" size={22} color="#262626" style={styles.menuIcon} />
              <Text style={styles.menuText}>고객센터</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#c7c7c7" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="document-outline" size={22} color="#262626" style={styles.menuIcon} />
              <Text style={styles.menuText}>이용약관</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#c7c7c7" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 8,
    borderBottomColor: '#f5f5f5',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeContractor: {
    backgroundColor: '#FFF3E0',
  },
  badgeText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },
  badgeTextContractor: {
    color: '#F57C00',
  },
  companyName: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  menuSection: {
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    marginRight: 14,
    width: 24,
  },
  menuText: {
    fontSize: 16,
    color: '#262626',
  },
  menuSubtext: {
    fontSize: 12,
    color: '#8e8e8e',
    marginTop: 2,
  },
  menuDivider: {
    height: 8,
    backgroundColor: '#f5f5f5',
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  logoutText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});
