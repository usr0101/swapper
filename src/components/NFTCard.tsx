import React, { useState } from 'react';
import { Star, Eye, ImageIcon, X, Copy, CheckCircle } from 'lucide-react';

interface NFTCardProps {
  nft: {
    id: number | string;
    name: string;
    collection: string;
    image: string;
    rarity: string;
    traits: number;
    attributes?: any[];
    description?: string;
    mint?: string;
  };
  isSelected?: boolean;
  onSelect?: () => void;
  showSelectButton?: boolean;
  isOwned?: boolean;
}

export const NFTCard: React.FC<NFTCardProps> = ({
  nft,
  isSelected = false,
  onSelect,
  showSelectButton = false,
  isOwned = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [copiedMint, setCopiedMint] = useState(false);

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleCopyMint = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!nft.mint) return;
    
    try {
      await navigator.clipboard.writeText(nft.mint);
      setCopiedMint(true);
      setTimeout(() => setCopiedMint(false), 2000);
    } catch (error) {
      console.error('Failed to copy mint address:', error);
    }
  };

  return (
    <>
      <div
        className={`group relative bg-white/5 border rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${
          isSelected 
            ? 'border-purple-500 shadow-lg shadow-purple-500/25' 
            : 'border-white/10 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-400/20'
        }`}
        onClick={onSelect}
      >
        {/* Smaller aspect ratio for more compact cards */}
        <div className="aspect-[4/3] relative overflow-hidden">
          {/* Loading State */}
          {imageLoading && (
            <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
            </div>
          )}
          
          {/* Error State */}
          {imageError && (
            <div className="absolute inset-0 bg-gray-700 flex flex-col items-center justify-center text-gray-400">
              <ImageIcon className="h-8 w-8 mb-1" />
              <span className="text-xs">No Image</span>
            </div>
          )}
          
          {/* NFT Image - Removed scale transform, keeping smooth transition */}
          {!imageError && nft.image && (
            <img
              src={nft.image}
              alt={nft.name}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
              crossOrigin="anonymous"
            />
          )}

          {/* Owned Badge - Smaller size */}
          {isOwned && (
            <div className="absolute top-2 right-2 bg-green-500 px-2 py-1 rounded-md text-xs font-semibold text-white shadow-lg">
              Owned
            </div>
          )}
        </div>

        {/* Compact content area */}
        <div className="p-3">
          <h3 className="text-sm font-semibold text-white mb-2 truncate" title={nft.name}>
            {nft.name}
          </h3>
          
          {/* Mint Address with Copy Button - Smaller */}
          {nft.mint && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-gray-400">
                {nft.mint.slice(0, 4)}...{nft.mint.slice(-4)}
              </span>
              <button
                onClick={handleCopyMint}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title="Copy mint address"
              >
                {copiedMint ? (
                  <CheckCircle className="h-3 w-3 text-green-400" />
                ) : (
                  <Copy className="h-3 w-3 text-gray-400 hover:text-white" />
                )}
              </button>
            </div>
          )}
          
          {/* Only show traits if there are any - Smaller */}
          {nft.traits > 0 && (
            <div className="flex items-center space-x-1 text-xs text-gray-400 mb-2">
              <Star className="h-3 w-3" />
              <span>{nft.traits} traits</span>
            </div>
          )}

          {/* Attributes Preview - Smaller and more compact */}
          {nft.attributes && nft.attributes.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-1">
                {nft.attributes.slice(0, 2).map((attr: any, index: number) => (
                  <span
                    key={index}
                    className="px-1.5 py-0.5 bg-white/10 rounded text-xs text-gray-300"
                    title={`${attr.trait_type}: ${attr.value}`}
                  >
                    {attr.value}
                  </span>
                ))}
                {nft.attributes.length > 2 && (
                  <span className="px-1.5 py-0.5 bg-white/10 rounded text-xs text-gray-300">
                    +{nft.attributes.length - 2}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Smaller select button */}
          {showSelectButton && (
            <button
              className={`w-full py-2 px-3 rounded-lg font-medium transition-all duration-200 text-sm ${
                isSelected
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              {isSelected ? 'Selected' : 'Select'}
            </button>
          )}
        </div>
      </div>

      {/* NFT Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/20 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">{nft.name}</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* NFT Image */}
                <div className="aspect-square relative overflow-hidden rounded-xl bg-gray-700">
                  {!imageError && nft.image ? (
                    <img
                      src={nft.image}
                      alt={nft.name}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                      <ImageIcon className="h-16 w-16 mb-4" />
                      <span>Image not available</span>
                    </div>
                  )}
                </div>

                {/* NFT Details */}
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Collection:</span>
                        <span className="text-white">{nft.collection}</span>
                      </div>
                      {nft.mint && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Mint:</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-mono text-xs">{nft.mint}</span>
                            <button
                              onClick={handleCopyMint}
                              className="p-1 hover:bg-white/10 rounded transition-colors"
                            >
                              {copiedMint ? (
                                <CheckCircle className="h-3 w-3 text-green-400" />
                              ) : (
                                <Copy className="h-3 w-3 text-gray-400 hover:text-white" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                      {nft.traits > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Traits:</span>
                          <span className="text-white">{nft.traits}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {nft.description && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                      <p className="text-gray-300 text-sm">{nft.description}</p>
                    </div>
                  )}

                  {/* Attributes */}
                  {nft.attributes && nft.attributes.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Attributes</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {nft.attributes.map((attr: any, index: number) => (
                          <div
                            key={index}
                            className="bg-white/5 border border-white/10 rounded-lg p-3"
                          >
                            <div className="text-xs text-gray-400 mb-1">{attr.trait_type}</div>
                            <div className="text-sm text-white font-medium">{attr.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};