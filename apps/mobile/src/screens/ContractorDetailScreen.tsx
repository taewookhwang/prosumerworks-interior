import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp, NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import api from '../services/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

type RouteProps = RouteProp<RootStackParamList, 'ContractorDetail'>;

interface Portfolio {
  id: string;
  title: string;
  category: string;
  images: { id: string; imageUrl: string; thumbnailUrl?: string }[];
}

interface Contractor {
  id: string;
  companyName: string;
  businessNumber: string;
  description: string;
  specialties: string[];
  serviceAreas: string[];
  contactPhone: string;
  contactEmail: string;
  user: {
    name: string;
    profileImage?: string;
  };
  portfolios: Portfolio[];
}

export const ContractorDetailScreen = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { id } = route.params;

  const { data: contractor, isLoading } = useQuery<Contractor>({
    queryKey: ['contractor', id],
    queryFn: async () => {
      const response = await api.get(`/contractors/${id}`);
      return response.data;
    },
  });

  if (isLoading || !contractor) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </SafeAreaView>
    );
  }

  const handlePortfolioPress = (portfolioId: string) => {
    navigation.navigate('PortfolioDetail', { id: portfolioId });
  };

  const handleQuoteRequest = () => {
    navigation.navigate('QuoteRequest', { contractorId: id });
  };

  const renderPortfolioCard = ({ item }: { item: Portfolio }) => {
    const thumbnail = item.images?.[0]?.thumbnailUrl || item.images?.[0]?.imageUrl;
    return (
      <TouchableOpacity
        style={styles.portfolioCard}
        onPress={() => handlePortfolioPress(item.id)}>
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.portfolioImage} />
        ) : (
          <View style={[styles.portfolioImage, styles.placeholder]}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
        <Text style={styles.portfolioTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.portfolioCategory}>{item.category}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView>
        <View style={styles.header}>
          <View style={styles.profileImageContainer}>
            {contractor.user?.profileImage ? (
              <Image
                source={{ uri: contractor.user.profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <View style={[styles.profileImage, styles.profilePlaceholder]}>
                <Text style={styles.profileInitial}>
                  {contractor.companyName.charAt(0)}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.companyName}>{contractor.companyName}</Text>
          <Text style={styles.ownerName}>
            {contractor.user?.name}
          </Text>
        </View>

        {contractor.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>업체 소개</Text>
            <Text style={styles.description}>{contractor.description}</Text>
          </View>
        )}

        {contractor.specialties && contractor.specialties.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>전문 분야</Text>
            <View style={styles.tagsContainer}>
              {contractor.specialties.map((specialty, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{specialty}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {contractor.serviceAreas && contractor.serviceAreas.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>서비스 지역</Text>
            <View style={styles.tagsContainer}>
              {contractor.serviceAreas.map((area, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{area}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>연락처</Text>
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>전화</Text>
            <Text style={styles.contactValue}>{contractor.contactPhone || '-'}</Text>
          </View>
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>이메일</Text>
            <Text style={styles.contactValue}>{contractor.contactEmail || '-'}</Text>
          </View>
        </View>

        {contractor.portfolios && contractor.portfolios.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              포트폴리오 ({contractor.portfolios.length})
            </Text>
            <FlatList
              data={contractor.portfolios}
              renderItem={renderPortfolioCard}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.portfolioRow}
              scrollEnabled={false}
            />
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.quoteButton} onPress={handleQuoteRequest}>
          <Text style={styles.quoteButtonText}>견적 문의하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileImageContainer: {
    marginBottom: 12,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
  },
  profilePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2196F3',
  },
  profileInitial: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  ownerName: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
  },
  tagText: {
    fontSize: 13,
    color: '#2196F3',
  },
  contactRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  contactLabel: {
    width: 60,
    fontSize: 14,
    color: '#666',
  },
  contactValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  portfolioRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  portfolioCard: {
    width: CARD_WIDTH,
  },
  portfolioImage: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
  },
  portfolioTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginTop: 8,
  },
  portfolioCategory: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  quoteButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  quoteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
