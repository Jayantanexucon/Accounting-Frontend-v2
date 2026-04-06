import React from "react";
import { ArrowRight, Lock, Shield, BookOpen, FileText, CreditCard, TrendingUp, Building, Cloud, ChevronDown, ChevronUp, Users } from "lucide-react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../authConfig";
import { ShieldAlertIcon } from "lucide-react";

export default function AuthPage() {
  const { instance } = useMsal();
  const [loading, setLoading] = React.useState(false);
  const [debugOpen, setDebugOpen] = React.useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      console.log("Initiating Azure login...", import.meta.env.VITE_AZURE_BACKEND_CLIENT_ID);
      await instance.loginRedirect(loginRequest);
    } catch (error) {
      console.error("Azure login failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const accountingFeatures = [
    { icon: <BookOpen className="w-4 h-4" />, text: "General Ledger & Journal Accounting" },
    { icon: <FileText className="w-4 h-4" />, text: "Invoice, Payments & Outstanding Tracking" },
    { icon: <CreditCard className="w-4 h-4" />, text: "Tax, TDS & Compliance Accounting" },
    { icon: <TrendingUp className="w-4 h-4" />, text: "Audit Trail & Activity Tracking" },
    { icon: <Users className="w-4 h-4" />, text: "Role-Based Secure Access" },
  ];

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
        <div className="flex flex-col md:flex-row">
          {/* Left Panel - Branding & Features */}
          <div
            className="md:w-1/2 text-white p-6 md:p-8"
            style={{
              backgroundImage: `url(https://res.cloudinary.com/dx1qdxmj5/image/upload/v1773132859/loginPgBG_wazxja.png)`,
            }}
          >
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mr-3 shadow-sm">
                <img src="https://res.cloudinary.com/dxqzklc00/image/upload/v1738485494/Nexu_revised_logo_pm8f5r.png" alt="Nexucon Logo" className="w-7 h-7" />
              </div>
              <div>
                <a href="https://www.nexucon.com/" target="_blank" rel="noopener noreferrer" >
                <h1 className="text-xl font-bold">Nexucon Pvt. Ltd.</h1>

                  <p className="text-xs text-blue-200 opacity-90 leading-tight">Nexucon Consultancy Services Private Limited</p>
                </a>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">Nexucon Accounting Software</h2>
              <p className="text-sm text-blue-100 opacity-90">Access your accounting platform with your Microsoft work account.</p>
            </div>

            <div className="space-y-3 mb-6">
              {accountingFeatures.map((feature, index) => (
                <div key={index} className="flex items-start">
                  <div className="text-blue-200 mr-3 mt-0.5">{feature.icon}</div>
                  <p className="text-sm font-medium">{feature.text}</p>
                </div>
              ))}
            </div>

            <div className="bg-blue-700/30 backdrop-blur-sm rounded-lg p-4 border border-blue-500/20">
              <div className="flex items-center mb-2">
                <ShieldAlertIcon className="w-4 h-4 mr-2 text-black" />
                <span className="text-sm font-semibold">Enterprise Security</span>
              </div>
              <p className="text-xs text-blue-100 opacity-90">Your financial data is protected by Microsoft's enterprise-grade security and encryption.</p>
            </div>
          </div>

          {/* Right Panel - Login Form */}
          <div className="md:w-1/2 p-6 md:p-8">
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <Building className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Nexucon Accounting So</h3>
                  <p className="text-xs text-gray-600">Enterprise Financial Platform</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">Authorized users only — sign in with your Microsoft enterprise account</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <Cloud className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-blue-800 font-medium mb-1">Secure Azure AD Authentication</p>
                  <p className="text-xs text-blue-700 opacity-90">You will be redirected to Microsoft's secure authentication page.</p>
                </div>
              </div>
            </div>

            <button
              disabled={loading}
              onClick={handleLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Connecting to Azure AD...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4z" />
                  </svg>
                  <span>Sign in with Microsoft</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-gray-500">Single Sign-On (SSO)</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center mb-2">
                <Lock className="w-4 h-4 text-gray-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Compliance & Security</span>
              </div>
              <p className="text-xs text-gray-600">Nexucon Accounting complies with financial regulations and uses enterprise-grade security protocols.</p>
            </div>

            {/* Debug Panel */}
            <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden">
              <button onClick={() => setDebugOpen(!debugOpen)} className="w-full p-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-sm font-medium text-gray-700">
                <span>System Information</span>
                {debugOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {debugOpen && (
                <div className="p-3 bg-gray-50 border-t border-gray-200">
                  <div className="text-xs font-medium text-gray-700 mb-1">Connection Details:</div>
                  <pre className="text-xs font-mono text-gray-600 whitespace-pre-wrap">
                    {JSON.stringify(
                      {
                        company: "Nexucon Consultancy Services Pvt Ltd",
                        system: "Accounting Platform",
                        environment: import.meta.env.MODE,
                        timestamp: new Date().toISOString(),
                      },
                      null,
                      2,
                    )}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center">
                Need assistance? <span className="text-blue-600 font-medium cursor-pointer">Contact Finance System Team</span>
                <br />
                <span className="text-xs text-gray-400 mt-1 block">© {new Date().getFullYear()} Nexucon Consultancy Services Private Limited</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Status Indicator */}
      {loading && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 border border-gray-200 flex items-center animate-pulse">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span className="text-sm font-medium">Connecting to Azure AD...</span>
        </div>
      )}

      {/* Animation Keyframes */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}