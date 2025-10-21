import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Star, 
  Download, 
  Shield, 
  Zap, 
  Users, 
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Heart,
  Eye
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  AgentMarketplaceEntry, 
  AgentType, 
  AgentCapability 
} from '../../types/ai-agents';
import { useAgentMarketplace } from '../../hooks/useAgentMarketplace';
import { AgentDetailsModal } from './AgentDetailsModal';
import { AgentInstallModal } from './AgentInstallModal';

interface AgentMarketplaceProps {
  className?: string;
}

export const AgentMarketplace: React.FC<AgentMarketplaceProps> = ({
  className = ''
}) => {
  const {
    agents,
    categories,
    isLoading,
    error,
    searchAgents,
    installAgent,
    getAgentDetails,
    addToWishlist,
    removeFromWishlist,
    refreshMarketplace
  } = useAgentMarketplace();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<AgentType | 'all'>('all');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [sortBy, setSortBy] = useState<'popularity' | 'rating' | 'newest' | 'price'>('popularity');
  const [selectedAgent, setSelectedAgent] = useState<AgentMarketplaceEntry | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());

  useEffect(() => {
    refreshMarketplace();
  }, [refreshMarketplace]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery) {
        searchAgents(searchQuery, {
          category: selectedCategory,
          type: selectedType,
          priceFilter,
          sortBy
        });
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, selectedCategory, selectedType, priceFilter, sortBy, searchAgents]);

  const filteredAgents = agents.filter(agent => {
    if (selectedCategory !== 'all' && agent.category !== selectedCategory) return false;
    if (selectedType !== 'all' && agent.type !== selectedType) return false;
    if (priceFilter === 'free' && agent.pricing.model !== 'free') return false;
    if (priceFilter === 'paid' && agent.pricing.model === 'free') return false;
    return true;
  });

  const sortedAgents = [...filteredAgents].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.ratings.average - a.ratings.average;
      case 'newest':
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      case 'price':
        const priceA = a.pricing.price || 0;
        const priceB = b.pricing.price || 0;
        return priceA - priceB;
      default: // popularity
        return b.ratings.totalReviews - a.ratings.totalReviews;
    }
  });

  const handleAgentClick = async (agent: AgentMarketplaceEntry) => {
    setSelectedAgent(agent);
    setShowDetailsModal(true);
  };

  const handleInstallAgent = (agent: AgentMarketplaceEntry) => {
    setSelectedAgent(agent);
    setShowInstallModal(true);
  };

  const handleWishlistToggle = async (agentId: string) => {
    try {
      if (wishlist.has(agentId)) {
        await removeFromWishlist(agentId);
        setWishlist(prev => {
          const newSet = new Set(prev);
          newSet.delete(agentId);
          return newSet;
        });
      } else {
        await addToWishlist(agentId);
        setWishlist(prev => new Set(prev).add(agentId));
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
    }
  };

  const getPriceDisplay = (pricing: any) => {
    if (pricing.model === 'free') return 'Free';
    if (pricing.model === 'subscription') {
      return `$${pricing.price}/${pricing.billingPeriod}`;
    }
    if (pricing.model === 'usage_based') return 'Usage-based';
    if (pricing.model === 'one_time') return `$${pricing.price}`;
    return 'Contact for pricing';
  };

  const getCapabilityIcon = (capability: AgentCapability) => {
    switch (capability) {
      case 'privacy_compliance_analysis':
        return <Shield className="w-4 h-4" />;
      case 'risk_assessment':
        return <AlertTriangle className="w-4 h-4" />;
      case 'data_classification':
        return <Filter className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Marketplace</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={refreshMarketplace}>Retry</Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Agent Marketplace</h1>
          <p className="text-gray-600">Discover and install AI agents to enhance your privacy operations</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="secondary">
            {sortedAgents.length} agents available
          </Badge>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as AgentType | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="AWS_PRIVACY">AWS Privacy</option>
              <option value="AICRA">AICRA</option>
              <option value="GOOGLE_AI">Google AI</option>
              <option value="AZURE_AI">Azure AI</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="popularity">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Newest</option>
              <option value="price">Price: Low to High</option>
            </select>
          </div>
        </div>

        {/* Additional Filters */}
        <div className="flex items-center space-x-4 mt-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Price:</span>
            <div className="flex space-x-2">
              {['all', 'free', 'paid'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setPriceFilter(filter as any)}
                  className={`px-3 py-1 text-sm rounded-md ${
                    priceFilter === filter
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedAgents.map((agent) => (
          <Card key={agent.id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 
                    className="font-semibold text-gray-900 hover:text-blue-600"
                    onClick={() => handleAgentClick(agent)}
                  >
                    {agent.name}
                  </h3>
                  {agent.verified && (
                    <CheckCircle className="w-4 h-4 text-blue-500" title="Verified Agent" />
                  )}
                  {agent.featured && (
                    <Star className="w-4 h-4 text-yellow-500" title="Featured Agent" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">{agent.vendor}</p>
                <p className="text-sm text-gray-700 line-clamp-2">{agent.description}</p>
              </div>
              
              <button
                onClick={() => handleWishlistToggle(agent.id)}
                className={`p-1 rounded-full ${
                  wishlist.has(agent.id)
                    ? 'text-red-500 hover:text-red-600'
                    : 'text-gray-400 hover:text-red-500'
                }`}
              >
                <Heart className={`w-4 h-4 ${wishlist.has(agent.id) ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Agent Type and Category */}
            <div className="flex items-center space-x-2 mb-3">
              <Badge variant="outline" className="text-xs">
                {agent.type.replace('_', ' ')}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {agent.category}
              </Badge>
            </div>

            {/* Capabilities */}
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-700 mb-2">Capabilities:</p>
              <div className="flex flex-wrap gap-1">
                {agent.capabilities.slice(0, 3).map((capability) => (
                  <div
                    key={capability}
                    className="flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded text-xs"
                  >
                    {getCapabilityIcon(capability)}
                    <span className="truncate">
                      {capability.replace(/_/g, ' ').slice(0, 12)}
                    </span>
                  </div>
                ))}
                {agent.capabilities.length > 3 && (
                  <div className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600">
                    +{agent.capabilities.length - 3} more
                  </div>
                )}
              </div>
            </div>

            {/* Rating and Reviews */}
            <div className="flex items-center space-x-2 mb-4">
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm font-medium">{agent.ratings.average.toFixed(1)}</span>
              </div>
              <span className="text-sm text-gray-600">
                ({agent.ratings.totalReviews} reviews)
              </span>
            </div>

            {/* Price and Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-gray-500" />
                <span className="font-semibold text-gray-900">
                  {getPriceDisplay(agent.pricing)}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAgentClick(agent)}
                  className="flex items-center space-x-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>View</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleInstallAgent(agent)}
                  className="flex items-center space-x-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Install</span>
                </Button>
              </div>
            </div>

            {/* Trial Period */}
            {agent.pricing.trialPeriod && (
              <div className="mt-2 text-xs text-green-600 flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{agent.pricing.trialPeriod} day free trial</span>
              </div>
            )}
          </Card>
        ))}
      </div>

      {sortedAgents.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Agents Found</h3>
          <p className="text-gray-600">Try adjusting your search criteria or filters.</p>
        </div>
      )}

      {/* Modals */}
      {showDetailsModal && selectedAgent && (
        <AgentDetailsModal
          agent={selectedAgent}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedAgent(null);
          }}
          onInstall={() => {
            setShowDetailsModal(false);
            setShowInstallModal(true);
          }}
        />
      )}

      {showInstallModal && selectedAgent && (
        <AgentInstallModal
          agent={selectedAgent}
          isOpen={showInstallModal}
          onClose={() => {
            setShowInstallModal(false);
            setSelectedAgent(null);
          }}
          onInstall={async (config) => {
            await installAgent(selectedAgent.id, config);
            setShowInstallModal(false);
            setSelectedAgent(null);
          }}
        />
      )}
    </div>
  );
};