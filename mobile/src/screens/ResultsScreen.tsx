import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getWebsite, queryWebsite } from '../services/api';
import { RootStackParamList } from '../../App';

type ResultsScreenProps = {
  route: RouteProp<RootStackParamList, 'Results'>;
};

const ResultsScreen: React.FC<ResultsScreenProps> = ({ route }) => {
  const { id } = route.params;
  const [website, setWebsite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState<string | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);

  useEffect(() => {
    fetchWebsite();
  }, []);

  const fetchWebsite = async () => {
    try {
      const response = await getWebsite(id);
      setWebsite(response.data);
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Failed to load website data'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = async () => {
    if (!query.trim()) {
      Alert.alert('Error', 'Please enter a query');
      return;
    }

    setQueryLoading(true);
    setQueryResult(null);

    try {
      const response = await queryWebsite(id, query);
      setQueryResult(response.data.result);
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Failed to process query'
      );
    } finally {
      setQueryLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading website data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.contentCard}>
        <Text style={styles.title}>{website.title}</Text>
        <TouchableOpacity
          style={styles.urlContainer}
          onPress={() => Alert.alert('URL', website.url)}
        >
          <Icon name="link" size={16} color="#3B82F6" />
          <Text style={styles.url} numberOfLines={1}>
            {website.url}
          </Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text style={styles.summary}>{website.summary}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Keywords</Text>
          <View style={styles.keywordsContainer}>
            {website.keywords.slice(0, 10).map((keyword: any, index: number) => (
              <View key={index} style={styles.keyword}>
                <Text style={styles.keywordText}>
                  {keyword.word} ({keyword.count})
                </Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setShowFullContent(!showFullContent)}
        >
          <Icon
            name={showFullContent ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#3B82F6"
          />
          <Text style={styles.toggleButtonText}>
            {showFullContent ? 'Hide full content' : 'Show full content'}
          </Text>
        </TouchableOpacity>

        {showFullContent && (
          <Text style={styles.fullContent}>{website.content}</Text>
        )}
      </View>

      <View style={styles.queryCard}>
        <Text style={styles.queryTitle}>Ask about this content</Text>
        <TextInput
          style={styles.queryInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Ask a question about this website..."
          multiline
        />
        <TouchableOpacity
          style={[styles.queryButton, queryLoading && styles.queryButtonDisabled]}
          onPress={handleQuery}
          disabled={queryLoading}
        >
          {queryLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="send" size={20} color="#fff" style={styles.queryButtonIcon} />
              <Text style={styles.queryButtonText}>Ask</Text>
            </>
          )}
        </TouchableOpacity>

        {queryResult && (
          <View style={styles.queryResult}>
            <Text style={styles.queryResultTitle}>Answer</Text>
            <Text style={styles.queryResultText}>{queryResult}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  contentCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  url: {
    marginLeft: 4,
    color: '#3B82F6',
    fontSize: 14,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  summary: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keyword: {
    backgroundColor: '#e0f2fe',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  keywordText: {
    color: '#3B82F6',
    fontSize: 14,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  toggleButtonText: {
    marginLeft: 4,
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  fullContent: {
    marginTop: 16,
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
  },
  queryCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  queryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  queryInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    minHeight: 80,
  },
  queryButton: {
    backgroundColor: '#3B82F6',
    padding: 14,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  queryButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  queryButtonIcon: {
    marginRight: 8,
  },
  queryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  queryResult: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
  },
  queryResultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 8,
  },
  queryResultText: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
  },
});

export default ResultsScreen;