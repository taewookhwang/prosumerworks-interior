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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp, NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import { portfolioService } from '../services/portfolio';

const { width } = Dimensions.get('window');

type RouteProps = RouteProp<RootStackParamList, 'PortfolioDetail'>;

export const PortfolioDetailScreen = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const { id } = route.params;

  const { data: portfolio, isLoading } = useQuery({
    queryKey: ['portfolio', id],
    queryFn: () => portfolioService.getPortfolio(id),
  });

  const likeMutation = useMutation({
    mutationFn: () =>
      portfolio?.isLiked
        ? portfolioService.unlikePortfolio(id)
        : portfolioService.likePortfolio(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', id] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      portfolio?.isSaved
        ? portfolioService.unsavePortfolio(id)
        : portfolioService.savePortfolio(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', id] });
    },
  });

  if (isLoading || !portfolio) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </SafeAreaView>
    );
  }

  const formatCost = (min?: number, max?: number) => {
    if (!min && !max) return null;
    const formatNumber = (n: number) =>
      n >= 10000 ? `${(n / 10000).toFixed(0)}억` : `${n.toLocaleString()}만원`;
    if (min && max) {
      return `${formatNumber(min)} ~ ${formatNumber(max)}`;
    }
    return formatNumber(min || max || 0);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.imageCarousel}>
          {portfolio.images?.map((image, index) => (
            <Image
              key={image.id}
              source={{ uri: image.imageUrl }}
              style={styles.carouselImage}
              resizeMode="cover"
            />
          ))}
          {(!portfolio.images || portfolio.images.length === 0) && (
            <View style={[styles.carouselImage, styles.placeholder]}>
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.content}>
          <Text style={styles.title}>{portfolio.title}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.category}>{portfolio.category}</Text>
            {portfolio.subCategory && (
              <Text style={styles.subCategory}> · {portfolio.subCategory}</Text>
            )}
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>위치</Text>
              <Text style={styles.infoValue}>
                {portfolio.locationCity} {portfolio.locationDistrict}
              </Text>
            </View>
            {portfolio.apartmentName && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>아파트</Text>
                <Text style={styles.infoValue}>{portfolio.apartmentName}</Text>
              </View>
            )}
            {portfolio.areaSize && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>평수</Text>
                <Text style={styles.infoValue}>{portfolio.areaSize}평</Text>
              </View>
            )}
            {portfolio.durationDays && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>공사기간</Text>
                <Text style={styles.infoValue}>{portfolio.durationDays}일</Text>
              </View>
            )}
            {(portfolio.costMin || portfolio.costMax) && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>공사비용</Text>
                <Text style={styles.infoValue}>
                  {formatCost(portfolio.costMin, portfolio.costMax)}
                </Text>
              </View>
            )}
          </View>

          {portfolio.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>상세설명</Text>
              <Text style={styles.description}>{portfolio.description}</Text>
            </View>
          )}

          {portfolio.contractor && (
            <TouchableOpacity
              style={styles.contractorCard}
              onPress={() =>
                navigation.navigate('ContractorDetail', { id: portfolio.contractor!.id })
              }>
              {portfolio.contractor.profileImage ? (
                <Image
                  source={{ uri: portfolio.contractor.profileImage }}
                  style={styles.contractorImage}
                />
              ) : (
                <View style={styles.contractorImagePlaceholder}>
                  <Text style={styles.contractorImageText}>
                    {portfolio.contractor.companyName?.[0] || '업'}
                  </Text>
                </View>
              )}
              <View style={styles.contractorInfo}>
                <Text style={styles.contractorName}>
                  {portfolio.contractor.companyName}
                </Text>
                <Text style={styles.contractorDesc} numberOfLines={2}>
                  {portfolio.contractor.career || portfolio.contractor.description || '업체 정보 보기'}
                </Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          )}

          <View style={styles.stats}>
            <Text style={styles.stat}>조회 {portfolio.viewCount}</Text>
            <Text style={styles.stat}>좋아요 {portfolio.likeCount}</Text>
            <Text style={styles.stat}>저장 {portfolio.saveCount}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => likeMutation.mutate()}>
          <Text style={[styles.actionIcon, portfolio.isLiked && styles.actionIconActive]}>
            ♥
          </Text>
          <Text style={[styles.actionText, portfolio.isLiked && styles.actionTextActive]}>좋아요</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => saveMutation.mutate()}>
          <Text style={[styles.actionIcon, portfolio.isSaved && styles.saveIconActive]}>
            ★
          </Text>
          <Text style={[styles.actionText, portfolio.isSaved && styles.saveTextActive]}>저장</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.inquiryButton}
          onPress={() => {
            console.log('Inquiry button pressed, contractor:', portfolio.contractor);
            if (portfolio.contractor) {
              navigation.navigate('QuoteRequest', {
                contractorId: portfolio.contractor.id,
                portfolioId: id,
              });
            } else {
              console.log('No contractor found for this portfolio');
            }
          }}>
          <Text style={styles.inquiryText}>견적 문의하기</Text>
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
  imageCarousel: {
    height: width,
  },
  carouselImage: {
    width,
    height: width,
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  category: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  subCategory: {
    fontSize: 14,
    color: '#666',
  },
  infoGrid: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  descriptionSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  contractorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  contractorImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#e0e0e0',
  },
  contractorImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contractorImageText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  contractorInfo: {
    flex: 1,
  },
  contractorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  contractorDesc: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  arrow: {
    fontSize: 20,
    color: '#999',
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    fontSize: 12,
    color: '#999',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 4,
    color: '#999',
  },
  actionIconActive: {
    color: '#E91E63',
  },
  actionText: {
    fontSize: 12,
    color: '#666',
  },
  actionTextActive: {
    color: '#E91E63',
  },
  saveIconActive: {
    color: '#FFC107',
  },
  saveTextActive: {
    color: '#FFC107',
  },
  inquiryButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 14,
    marginLeft: 16,
  },
  inquiryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
