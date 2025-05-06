import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { scrapeWebsite } from '../services/api';
import { RootStackParamList } from '../../App';
import { validateURL } from '../utils';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }

    if (!validateURL(url)) {
      Alert.alert('Error', 'Please enter a valid URL and only educational website URL.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await scrapeWebsite(url);
      navigation.navigate('Results', { id: response.data._id });
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'An error occurred while scraping the website'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: 'web',
      title: 'Web Scraping',
      description: 'Extract content from any website with a simple URL input',
    },
    {
      icon: 'magnify',
      title: 'Content Analysis',
      description: 'Analyze keywords, frequencies, and generate summaries automatically',
    },
    {
      icon: 'database',
      title: 'Data Storage',
      description: 'Store all scraped content for future reference',
    },
    {
      icon: 'brain',
      title: 'Smart Queries',
      description: 'Ask questions about the content and get intelligent answers',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          <Text style={styles.highlight}>Extract</Text> and{' '}
          <Text style={styles.highlight}>Analyze</Text> Web Content
        </Text>
        <Text style={styles.subtitle}>
          Input any website URL, and we'll scrape the content, analyze it, and provide insights.
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Website URL</Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="https://example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="magnify" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Analyze</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>Key Features</Text>
        <View style={styles.features}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <Icon name={feature.icon} size={32} color="#3B82F6" />
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#1f2937',
  },
  highlight: {
    color: '#3B82F6',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6b7280',
    paddingHorizontal: 20,
  },
  form: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 14,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#93c5fd',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  featuresContainer: {
    padding: 20,
  },
  featuresTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#1f2937',
  },
  features: {
    gap: 16,
  },
  featureCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
    color: '#374151',
  },
  featureDescription: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6b7280',
  },
});

export default HomeScreen;