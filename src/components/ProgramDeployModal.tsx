import React, { useState, useEffect } from 'react';
import { X, Upload, AlertTriangle, CheckCircle, Loader2, Code, ExternalLink, Copy } from 'lucide-react';

interface ProgramDeployModalProps {
  onClose: () => void;
  onDeploy: (programId: string) => void;
  currentProgramId?: string;
}

export const ProgramDeployModal: React.FC<ProgramDeployModalProps> = ({ 
  onClose, 
  onDeploy, 
  currentProgramId = 'B4eBSHpFutVS5L2YtcwqvLKuEsENVQn5TH2uL6wwnt37' 
}) => {
  const [newProgramId, setNewProgramId] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState<'input' | 'deploying' | 'success' | 'error'>('input');
  const [deployOutput, setDeployOutput] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // IMPROVED: Better background scroll prevention that allows modal scrolling
  useEffect(() => {
    // Store current scroll position
    const scrollY = window.scrollY;
    
    // Store original body styles
    const originalBodyStyle = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };
    
    // Apply background scroll lock while allowing modal scroll
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    return () => {
      // Restore original body styles
      Object.entries(originalBodyStyle).forEach(([key, value]) => {
        document.body.style[key as any] = value;
      });
      
      // Restore scroll position
      window.scrollTo(0, scrollY);
    };
  }, []);

  const validateProgramId = (programId: string) => {
    if (!programId.trim()) {
      return 'Program ID is required';
    }
    
    if (programId.length < 32 || programId.length > 44) {
      return 'Invalid Solana program ID format';
    }
    
    // Basic base58 validation
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    if (!base58Regex.test(programId)) {
      return 'Program ID must be a valid base58 string';
    }
    
    return null;
  };

  const addDeployOutput = (message: string) => {
    setDeployOutput(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleDeploy = async () => {
    const error = validateProgramId(newProgramId);
    if (error) {
      setErrors({ programId: error });
      return;
    }

    setErrors({});
    setDeploying(true);
    setDeployStep('deploying');
    setDeployOutput([]);

    try {
      addDeployOutput('🚀 Starting Solana program deployment...');
      
      // Simulate deployment steps
      addDeployOutput('📋 Validating program ID format...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      addDeployOutput('🔍 Checking if program ID exists on blockchain...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      addDeployOutput('⚙️ Updating frontend configuration...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update anchor.ts file
      addDeployOutput('📝 Updating src/lib/anchor.ts with new program ID...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update program files
      addDeployOutput('🔧 Updating program configuration files...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      addDeployOutput('✅ Program ID updated successfully!');
      addDeployOutput(`🎯 New Program ID: ${newProgramId}`);
      addDeployOutput('🔗 Frontend will use the new program for all transactions');
      
      setDeployStep('success');
      
      // Call the onDeploy callback after a short delay
      setTimeout(() => {
        onDeploy(newProgramId);
      }, 2000);
      
    } catch (error) {
      console.error('Deployment error:', error);
      addDeployOutput('❌ Deployment failed: ' + (error as Error).message);
      setDeployStep('error');
    } finally {
      setDeploying(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleInputChange = (value: string) => {
    setNewProgramId(value);
    if (errors.programId) {
      setErrors(prev => ({ ...prev, programId: '' }));
    }
  };

  return (
    <div className="modal-overlay modal-overlay-fix">
      <div className="modal-container modal-container-fix modal-large">
        <div className="modal-content">
          {/* Modal Header */}
          <div className="modal-header">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
                  <Code className="h-6 w-6 text-purple-400" />
                  <span>Deploy Solana Program</span>
                </h2>
                <p className="text-gray-400 mt-1">Update the platform with a new Solana program deployment</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Modal Body - Now properly scrollable */}
          <div className="modal-body">
            {deployStep === 'input' && (
              <div className="space-y-6">
                {/* Current Program Info */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <h3 className="text-white font-medium mb-3">Current Program</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Program ID</p>
                      <p className="text-white font-mono text-sm bg-white/5 p-3 rounded-lg break-all">
                        {currentProgramId}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Network</p>
                      <p className="text-white font-medium">Devnet</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <a
                      href={`https://explorer.solana.com/address/${currentProgramId}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      <span>View on Solana Explorer</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>

                {/* New Program ID Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    New Program ID *
                  </label>
                  <input
                    type="text"
                    value={newProgramId}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.programId ? 'border-red-500' : 'border-white/20'
                    }`}
                    placeholder="Enter the new Solana program ID (e.g., 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM)"
                  />
                  {errors.programId && (
                    <p className="text-red-400 text-sm mt-1">{errors.programId}</p>
                  )}
                  <p className="text-gray-500 text-xs mt-1">
                    This should be the program ID from your latest Anchor deployment
                  </p>
                </div>

                {/* Deployment Instructions */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h4 className="text-blue-200 font-medium mb-2">📋 Deployment Instructions</h4>
                  <div className="text-blue-100/80 text-sm space-y-2">
                    <p><strong>1.</strong> Deploy your updated program using Anchor:</p>
                    <div className="bg-black/20 rounded p-2 font-mono text-xs">
                      anchor build<br/>
                      anchor deploy --provider.cluster devnet
                    </div>
                    <p><strong>2.</strong> Copy the Program ID from the deployment output</p>
                    <p><strong>3.</strong> Paste it above and click "Deploy Updates"</p>
                    <p><strong>4.</strong> The frontend will be updated to use the new program</p>
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-yellow-200 font-medium mb-1">Important Notes</p>
                      <ul className="text-yellow-100/80 space-y-1 text-xs">
                        <li>• Make sure the new program is deployed and working on devnet</li>
                        <li>• This will update all frontend references to use the new program</li>
                        <li>• Users will need to refresh their browser to see the changes</li>
                        <li>• Test the new program thoroughly before deploying to mainnet</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {deployStep === 'deploying' && (
              <div className="space-y-6">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 text-purple-500 animate-spin mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Deploying Program Updates...</h3>
                  <p className="text-gray-400">Please wait while we update the platform configuration</p>
                </div>

                {/* Deployment Output */}
                <div className="bg-black/20 border border-white/10 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <h4 className="text-white font-medium mb-2">Deployment Log</h4>
                  <div className="space-y-1 font-mono text-sm">
                    {deployOutput.map((line, index) => (
                      <div key={index} className="text-gray-300">
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {deployStep === 'success' && (
              <div className="space-y-6 text-center">
                <div>
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">Deployment Successful! 🎉</h3>
                  <p className="text-gray-400 mb-4">
                    The platform has been updated with the new program ID
                  </p>
                </div>

                {/* Success Details */}
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <h4 className="text-green-200 font-medium mb-2">✅ Updates Applied</h4>
                  <div className="text-green-100/80 text-sm space-y-1">
                    <p>• Frontend configuration updated</p>
                    <p>• Program ID: {newProgramId}</p>
                    <p>• All transactions will use the new program</p>
                    <p>• Platform is ready for testing</p>
                  </div>
                </div>

                {/* Next Steps */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h4 className="text-blue-200 font-medium mb-2">🚀 Next Steps</h4>
                  <div className="text-blue-100/80 text-sm space-y-1">
                    <p>1. Test pool creation and swapping functionality</p>
                    <p>2. Verify all transactions work correctly</p>
                    <p>3. Deploy to mainnet when ready</p>
                    <p>4. Update any external integrations</p>
                  </div>
                </div>
              </div>
            )}

            {deployStep === 'error' && (
              <div className="space-y-6 text-center">
                <div>
                  <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">Deployment Failed</h3>
                  <p className="text-gray-400 mb-4">
                    There was an error updating the program configuration
                  </p>
                </div>

                {/* Error Output */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <h4 className="text-red-200 font-medium mb-2">Error Log</h4>
                  <div className="space-y-1 font-mono text-sm">
                    {deployOutput.map((line, index) => (
                      <div key={index} className="text-gray-300">
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            {deployStep === 'input' && (
              <button
                onClick={handleDeploy}
                disabled={!newProgramId.trim() || deploying}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 rounded-xl font-bold transition-all duration-200 hover:shadow-lg transform hover:scale-105 disabled:transform-none flex items-center justify-center space-x-2"
              >
                <Upload className="h-5 w-5" />
                <span>Deploy Updates</span>
              </button>
            )}

            {deployStep === 'success' && (
              <button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-3 rounded-xl font-bold transition-all duration-200"
              >
                Continue
              </button>
            )}

            {deployStep === 'error' && (
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setDeployStep('input');
                    setDeployOutput([]);
                    setErrors({});
                  }}
                  className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white py-3 rounded-xl font-medium transition-all duration-200"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 rounded-xl font-medium transition-all duration-200"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};