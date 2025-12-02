import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { Portfolio } from '../types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface PortfolioCardProps {
  portfolio: Portfolio;
  onPress: () => void;
  onLike: () => void;
}

export const PortfolioCard: React.FC<PortfolioCardProps> = ({
  portfolio,
  onPress,
  onLike,
}) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.imageContainer}>
        {portfolio.thumbnailUrl ? (
          <Image
            source={{ uri: portfolio.thumbnailUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
        <TouchableOpacity style={styles.likeButton} onPress={onLike}>
          <Text style={styles.likeIcon}>{portfolio.isLiked ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {portfolio.title}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.location}>
            {portfolio.locationCity}
            {portfolio.locationDistrict && ` ${portfolio.locationDistrict}`}
          </Text>
          {portfolio.areaSize && (
            <Text style={styles.size}>{portfolio.areaSize}평</Text>
          )}
        </View>
        {portfolio.contractor && (
          <View style={styles.contractor}>
            <Text style={styles.contractorName} numberOfLines={1}>
              {portfolio.contractor.companyName}
            </Text>
          </View>
        )}
        <View style={styles.stats}>
          <Text style={styles.likes}>❤️ {portfolio.likeCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.2,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 12,
  },
  likeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 16,
    padding: 6,
  },
  likeIcon: {
    fontSize: 16,
  },
  info: {
    paddingTop: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 8,
  },
  location: {
    fontSize: 12,
    color: '#666',
  },
  size: {
    fontSize: 12,
    color: '#666',
  },
  contractor: {
    marginTop: 4,
  },
  contractorName: {
    fontSize: 12,
    color: '#2196F3',
  },
  stats: {
    flexDirection: 'row',
    marginTop: 4,
  },
  likes: {
    fontSize: 12,
    color: '#999',
  },
});
