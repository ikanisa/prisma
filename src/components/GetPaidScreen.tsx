import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, QrCode, Link } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ValidationUtils } from '@/utils/validation';
import AccessibleButton from './AccessibleButton';
import LoadingSpinner from './LoadingSpinner';
import { addPhone, addAmount, addQRCode, getRecentPhones, getRecentAmounts, isSimulateOffline } from '@/utils/offlineCache';
const GetPaidScreen = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [showAmountLabel, setShowAmountLabel] = useState(true);
  const [showPhoneLabel, setShowPhoneLabel] = useState(true);
  const [amountInteracted, setAmountInteracted] = useState(false);
  const [phoneInteracted, setPhoneInteracted] = useState(false);
  const [errors, setErrors] = useState<{
    amount?: string;
    phone?: string;
  }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  useEffect(() => {
    // Autofill from cache if nothing in localStorage
    if (!phone) {
      const fromCache = getRecentPhones()[0];
      if (fromCache) setPhone(fromCache);
    }
    // Optionally autofill recent amount below
  }, []);
  useEffect(() => {
    const savedPhone = localStorage.getItem('userPhone');
    if (savedPhone) {
      setPhone(savedPhone);
      setPhoneInteracted(true);
      setShowPhoneLabel(false);
    }
  }, []);
  const formatAmount = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = ValidationUtils.sanitizeInput(e.target.value);
    const cleaned = value.replace(/[^0-9]/g, '');
    const formatted = formatAmount(cleaned);
    setAmount(formatted);
    if (errors.amount) {
      setErrors(prev => ({
        ...prev,
        amount: undefined
      }));
    }
  };
  const handleAmountFocus = () => {
    if (!amountInteracted) {
      setAmountInteracted(true);
      setShowAmountLabel(false);
    }
  };
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = ValidationUtils.sanitizeInput(e.target.value);
    const cleaned = value.replace(/[^0-9+]/g, '');
    setPhone(cleaned);
    localStorage.setItem('userPhone', cleaned);
    if (errors.phone) {
      setErrors(prev => ({
        ...prev,
        phone: undefined
      }));
    }
  };
  const handlePhoneFocus = () => {
    if (!phoneInteracted) {
      setPhoneInteracted(true);
      setShowPhoneLabel(false);
    }
  };
  const validateInputs = (): boolean => {
    const rawAmount = amount.replace(/,/g, '');
    const amountValidation = ValidationUtils.validateAmount(rawAmount);
    const phoneValidation = ValidationUtils.validateRWPhoneNumber(phone);
    const newErrors: {
      amount?: string;
      phone?: string;
    } = {};
    if (!amountValidation.isValid) {
      newErrors.amount = amountValidation.error;
    }
    if (!phoneValidation.isValid) {
      newErrors.phone = phoneValidation.error;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const generateQRCode = async () => {
    if (!validateInputs()) return;
    setIsGenerating(true);
    try {
      const rawAmount = amount.replace(/,/g, '');
      // Save to local cache for offline re-use
      addPhone(phone);
      addAmount(amount);
      addQRCode({
        phone,
        amount,
        ussdString: `*182*1*1*${phone}*${rawAmount}#`,
        timestamp: Date.now()
      });
      const offline = !navigator.onLine || isSimulateOffline();
      if (offline) {
        toast({
          title: "Offline Mode",
          description: "QR generated offline. Save/share or revisit from QR history."
        });
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      navigate(`/qr-preview?amount=${rawAmount}&phone=${phone}`);
    } catch (error) {
      toast({
        title: "Ikosa",
        description: "QR ntiyashobotse. Ongera ugerageze.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };
  const sharePaymentLink = async () => {
    if (!validateInputs()) return;
    setIsSharing(true);
    try {
      const rawAmount = amount.replace(/,/g, '');
      const paymentLink = `${window.location.origin}/pay?amount=${rawAmount}&phone=${phone}`;
      const shareText = `Request for ${rawAmount} RWF. Pay via Mobile Money Rwanda: *182*8*1*${phone}*${rawAmount}#`;
      if (navigator.share) {
        await navigator.share({
          title: 'Payment Request (Rwanda)',
          text: shareText,
          url: paymentLink
        });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n\n${paymentLink}`);
        toast({
          title: "Link Yakopwe!",
          description: "Sangiza ubu butumwa n'ugomba kwishyura"
        });
      }
    } catch (error) {
      toast({
        title: "Ikosa",
        description: "Gusangiza link ntibyakunze, ongera ugerageze.",
        variant: "destructive"
      });
    } finally {
      setIsSharing(false);
    }
  };

  // Autofill recent values if offline
  const phoneSuggestions = getRecentPhones();
  const amountSuggestions = getRecentAmounts();
  return <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:via-purple-900 dark:to-pink-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate('/')} className="glass-card p-3 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Subira ahabanza">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Saba Kwishyurwa
          </h1>
          <div className="w-12" aria-hidden="true"></div>
        </div>

        <div className="max-w-md mx-auto space-y-8">
          {/* Amount Input */}
          <div className="space-y-3">
            {showAmountLabel && <label htmlFor="amount" className="block text-lg font-semibold text-gray-700 dark:text-gray-300">
                Ingano y'Amafaranga (RWF)
              </label>}
            <input id="amount" type="text" inputMode="numeric" value={amount} onChange={handleAmountChange} onFocus={handleAmountFocus} placeholder={showAmountLabel ? "Andika ingano y'amafaranga" : "Ingano y'amafaranga (RWF)"} className={`w-full mobile-input text-center text-2xl font-bold ${errors.amount ? 'border-red-500 focus:ring-red-500/20' : ''}`} autoFocus aria-invalid={!!errors.amount} aria-describedby={errors.amount ? "amount-error" : undefined} list="recent-amounts" />
            <datalist id="recent-amounts">
              {amountSuggestions.map(a => <option value={a} key={a} />)}
            </datalist>
            {errors.amount && <p id="amount-error" className="text-error text-center" role="alert">
                {errors.amount}
              </p>}
          </div>

          {/* Phone Input */}
          <div className="space-y-3">
            {showPhoneLabel && <label htmlFor="phone" className="block text-lg font-semibold text-gray-700 dark:text-gray-300">
                Numero yawe ya telephone
              </label>}
            <input id="phone" type="tel" inputMode="numeric" value={phone} onChange={handlePhoneChange} onFocus={handlePhoneFocus} placeholder={showPhoneLabel ? "Urugero: 07XX..." : "Numero ya telefone"} className={`w-full mobile-input text-center text-xl ${errors.phone ? 'border-red-500 focus:ring-red-500/20' : ''}`} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-error" : "phone-help"} list="recent-phones" />
            <datalist id="recent-phones">
              {phoneSuggestions.map(p => <option value={p} key={p} />)}
            </datalist>
            {errors.phone ? <p id="phone-error" className="text-error text-center" role="alert">
                {errors.phone}
              </p> : <p id="phone-help" className="text-helper text-center text-sm font-normal">Numero yakira ubwishyu</p>}
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <AccessibleButton onClick={generateQRCode} variant="royal" size="lg" loading={isGenerating} className="w-full flex items-center justify-center space-x-4" aria-describedby="qr-description">
              {!isGenerating && <QrCode className="icon-large" />}
              <span>Kora QR Code</span>
            </AccessibleButton>
            <p id="qr-description" className="sr-only">
              Kora QR code kugirango abandi babashe kukwishyura byoroshye
            </p>

            <AccessibleButton onClick={sharePaymentLink} variant="primary" size="lg" loading={isSharing} className="w-full flex items-center justify-center space-x-4" aria-describedby="share-description">
              {!isSharing && <Link className="icon-large" />}
              <span>Sangiza Link yo Kwishyura</span>
            </AccessibleButton>
            <p id="share-description" className="sr-only">
              Sangiza link yo kwishyura kuri message, email, cyangwa imbuga nkoranyambaga
            </p>
          </div>
        </div>
      </div>
    </div>;
};
export default GetPaidScreen;