import React, { useState, useRef } from 'react';
import { useLedger } from '../../lib/ledger-context';
import { useAuth } from '../../lib/auth-context';
import { GoogleIcon } from '../icons/GoogleIcon';
import {
  uploadBackupToGoogleDrive,
  findBackupInGoogleDrive,
  downloadBackupFromGoogleDrive,
} from '../../lib/google-drive-service';
import {
  exportAccountsToCsv,
  exportTransactionsToCsv,
  exportTradesToCsv,
  exportDividendsToCsv,
  downloadFile,
} from '../../lib/audit-and-alerts';
import {
  exportNbrTaxStatementPdf,
  exportBalanceSheetPdf,
  exportIncomeStatementPdf,
  exportPortfolioValuationPdf,
  exportAuditReportPdf,
} from '../../lib/pdf-export-engine';
import {
  generateBalanceSheetReport,
  generateIncomeStatementReport,
  calculateCapitalGainsTaxSummary,
} from '../../lib/accounting-engine';
import {
  Download,
  Upload,
  Database,
  FileSpreadsheet,
  FileJson,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  HardDrive,
  Shield,
  Layers,
  FileText,
  CloudUpload,
  CloudDownload,
  Cloud,
  Smartphone,
  Laptop,
  Sparkles,
  Users,
  Lock,
  Unlock,
  Key,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { BackupBundle, EncryptedBackupBundle } from '../../types/accounting';
import {
  encryptBackupBundle,
  decryptBackupBundle,
  isEncryptedBackup,
  validatePassphrase,
} from '../../lib/encryption-service';
import {
  saveEncryptedBackupToFirestore,
  fetchEncryptedBackupFromFirestore,
} from '../../lib/cloud-sync-service';
import { Modal } from '../ui/Modal';

export const BackupRestoreView: React.FC = () => {
  const { user, firebaseUser, googleAccessToken, isGoogleAuthenticated, signInWithGoogle, refreshGoogleAccessToken, updateUserDriveSyncStatus } = useAuth();
  const activeUserId = firebaseUser?.uid || user?.id;
  const {
    accounts,
    accountBalances,
    transactions,
    transactionLines,
    categories,
    stocks,
    stockHoldings,
    stockTransactions,
    brokerCashBalances,
    dividends,
    debts,
    loans,
    physicalAssets,
    fixedDeposits,
    dpsAccounts,
    auditLogs,
    portfolioPerformanceMetrics,
    exportFullBackup,
    restoreFromBackup,
    resetTenantLedger,
    cloudSyncStatus,
    lastCloudSyncAt,
    cloudSyncError,
    syncWithCloud,
    restoreFromCloud,
  } = useLedger();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDriveBackingUp, setIsDriveBackingUp] = useState(false);
  const [isDriveRestoring, setIsDriveRestoring] = useState(false);
  const [driveMsg, setDriveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Cloud Sync Manual Trigger State
  const [isCloudSyncingManual, setIsCloudSyncingManual] = useState(false);
  const [isCloudRestoringManual, setIsCloudRestoringManual] = useState(false);
  const [cloudMsg, setCloudMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCloudSync = async () => {
    setIsCloudSyncingManual(true);
    setCloudMsg(null);
    const res = await syncWithCloud();
    setIsCloudSyncingManual(false);
    if (res.success) {
      setCloudMsg({
        type: 'success',
        text: `আপনার সমস্ত ডাটা সফলভাবে ক্লাউডে সেভ ও সিঙ্ক করা হয়েছে! (${new Date().toLocaleTimeString('bn-BD')})`,
      });
    } else {
      setCloudMsg({
        type: 'error',
        text: res.error || 'ক্লাউড সিঙ্ক করতে সমস্যা হয়েছে। অনুগ্রহ করে ইন্টারনেট ও সাইন-ইন চেক করুন।',
      });
    }
  };

  const handleCloudRestore = async () => {
    setIsCloudRestoringManual(true);
    setCloudMsg(null);
    const res = await restoreFromCloud();
    setIsCloudRestoringManual(false);
    if (res.success) {
      setRestoreSuccess(true);
      setCloudMsg({
        type: 'success',
        text: 'ক্লাউড থেকে আপনার সমস্ত অ্যাকাউন্ট ও লেনদেন সফলভাবে লোড হয়েছে!',
      });
    } else {
      setCloudMsg({
        type: 'error',
        text: res.error || 'ক্লাউডে কোনো ব্যাকআপ ফাইল পাওয়া যায়নি।',
      });
    }
  };

  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [parsedBundle, setParsedBundle] = useState<BackupBundle | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  // Reset confirmation state
  const [showResetModal, setShowResetModal] = useState(false);
  const [confirmResetText, setConfirmResetText] = useState('');

  // Encrypted JSON Export State
  const [showEncryptedExportModal, setShowEncryptedExportModal] = useState(false);
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [exportPassphraseConfirm, setExportPassphraseConfirm] = useState('');
  const [exportHint, setExportHint] = useState('');
  const [showExportPassword, setShowExportPassword] = useState(false);
  const [isEncryptingExport, setIsEncryptingExport] = useState(false);
  const [exportCryptoError, setExportCryptoError] = useState<string | null>(null);

  // Local File Decryption State (when uploaded file is encrypted)
  const [fileEncryptedBundle, setFileEncryptedBundle] = useState<EncryptedBackupBundle | null>(null);
  const [fileDecryptPassphrase, setFileDecryptPassphrase] = useState('');
  const [showFileDecryptPassword, setShowFileDecryptPassword] = useState(false);
  const [isDecryptingFile, setIsDecryptingFile] = useState(false);
  const [fileDecryptError, setFileDecryptError] = useState<string | null>(null);

  // Google Drive Encrypted Flow
  const [showDriveEncryptedModal, setShowDriveEncryptedModal] = useState(false);
  const [driveExportPassphrase, setDriveExportPassphrase] = useState('');
  const [driveExportPassphraseConfirm, setDriveExportPassphraseConfirm] = useState('');
  const [driveExportHint, setDriveExportHint] = useState('');
  const [showDriveExportPassword, setShowDriveExportPassword] = useState(false);
  const [isDriveEncrypting, setIsDriveEncrypting] = useState(false);
  const [driveExportError, setDriveExportError] = useState<string | null>(null);

  // Google Drive Encrypted Restore Decrypt Flow
  const [driveEncryptedBundle, setDriveEncryptedBundle] = useState<EncryptedBackupBundle | null>(null);
  const [showDriveDecryptModal, setShowDriveDecryptModal] = useState(false);
  const [driveDecryptPassphrase, setDriveDecryptPassphrase] = useState('');
  const [showDriveDecryptPassword, setShowDriveDecryptPassword] = useState(false);
  const [isDriveDecrypting, setIsDriveDecrypting] = useState(false);
  const [driveDecryptError, setDriveDecryptError] = useState<string | null>(null);

  // Cloud Vault (Firestore Encrypted Backup) State
  const [showCloudVaultModal, setShowCloudVaultModal] = useState(false);
  const [vaultMode, setVaultMode] = useState<'export' | 'restore'>('export');
  const [vaultPassphrase, setVaultPassphrase] = useState('');
  const [vaultPassphraseConfirm, setVaultPassphraseConfirm] = useState('');
  const [vaultHint, setVaultHint] = useState('');
  const [showVaultPassword, setShowVaultPassword] = useState(false);
  const [isVaultOperating, setIsVaultOperating] = useState(false);
  const [vaultError, setVaultError] = useState<string | null>(null);

  const handleBackupToDrive = async () => {
    if (!googleAccessToken) {
      setDriveMsg({ type: 'error', text: 'গুগল অ্যাকাউন্টে সাইন-ইন করা নেই। অনুগ্রহ করে Sign In with Google করুন।' });
      return;
    }

    setIsDriveBackingUp(true);
    setDriveMsg(null);
    await updateUserDriveSyncStatus('pending');

    const bundle = exportFullBackup();
    const result = await uploadBackupToGoogleDrive(googleAccessToken, bundle, refreshGoogleAccessToken);

    setIsDriveBackingUp(false);

    if (result.success) {
      await updateUserDriveSyncStatus('synced', result.lastBackupAt);
      setDriveMsg({
        type: 'success',
        text: `আপনার লেজার সফলভাবে Google Drive-এ সেভ করা হয়েছে! (${new Date().toLocaleTimeString('bn-BD')})`,
      });
    } else {
      await updateUserDriveSyncStatus('error');
      let errorText = result.error || 'Google Drive-এ ব্যাকআপ সেভ করা যায়নি।';
      if (result.isAuthError) {
        errorText = 'গুগল সাইন-ইন সেশন শেষ হয়ে গেছে: অনুগ্রহ করে একবার Sign In with Google দিয়ে পুনরায় কানেক্ট করুন।';
      } else if (errorText.toLowerCase().includes('insufficient') || errorText.includes('403')) {
        errorText = 'গুগল ড্রাইভ পারমিশন প্রয়োজন: অনুগ্রহ করে Sign In with Google করে ড্রাইভের অনুমতি Allow দিন।';
      }
      setDriveMsg({
        type: 'error',
        text: errorText,
      });
    }
  };

  const handleRestoreFromDrive = async () => {
    if (!googleAccessToken) {
      setDriveMsg({ type: 'error', text: 'গুগল অ্যাকাউন্টে সাইন-ইন করা নেই। অনুগ্রহ করে Sign In with Google করুন।' });
      return;
    }

    setIsDriveRestoring(true);
    setDriveMsg(null);

    const backupInfo = await findBackupInGoogleDrive(googleAccessToken, refreshGoogleAccessToken);

    if (!backupInfo.found || !backupInfo.fileId) {
      setIsDriveRestoring(false);
      if (backupInfo.isAuthError) {
        setDriveMsg({
          type: 'error',
          text: backupInfo.error || 'গুগল সাইন-ইন সেশন শেষ হয়ে গেছে। অনুগ্রহ করে Sign In with Google দিয়ে পুনরায় কানেক্ট করুন।',
        });
      } else {
        setDriveMsg({
          type: 'error',
          text: backupInfo.error || 'আপনার গুগল ড্রাইভে কোনো ব্যাকআপ ফাইল পাওয়া যায়নি। মোবাইল অ্যাপ থেকে "Backup to Drive" বাটনে ক্লিক করেছেন কি না নিশ্চিত করুন, অথবা উপরের Real-Time Cloud Sync ব্যবহার করুন যা স্বয়ংক্রিয়ভাবে মোবাইল ও ব্রাউজার সিঙ্ক করে।',
        });
      }
      return;
    }

    const { bundle, encryptedBundle, isEncrypted, error } = await downloadBackupFromGoogleDrive(googleAccessToken, backupInfo.fileId, refreshGoogleAccessToken);

    setIsDriveRestoring(false);

    if (error) {
      setDriveMsg({
        type: 'error',
        text: error || 'Google Drive থেকে ব্যাকআপ ডাউনলোড করা যায়নি।',
      });
      return;
    }

    if (isEncrypted && encryptedBundle) {
      setDriveEncryptedBundle(encryptedBundle);
      setDriveDecryptPassphrase('');
      setDriveDecryptError(null);
      setShowDriveDecryptModal(true);
      return;
    }

    if (!bundle) {
      setDriveMsg({
        type: 'error',
        text: 'Google Drive থেকে কোনো বৈধ ব্যাকআপ পাওয়া যায়নি।',
      });
      return;
    }

    const res = restoreFromBackup(bundle);
    if (res.success) {
      setRestoreSuccess(true);
      setDriveMsg({
        type: 'success',
        text: `Google Drive ব্যাকআপ (${backupInfo.fileName || 'backup'}) থেকে সমস্ত ডাটা সফলভাবে রিস্টোর হয়েছে!`,
      });
    } else {
      setDriveMsg({
        type: 'error',
        text: res.error || 'ব্যাকআপ ফাইল রিস্টোর করতে সমস্যা হয়েছে।',
      });
    }
  };

  const handleExecuteDriveEncryptedBackup = async () => {
    if (!googleAccessToken) {
      setDriveMsg({ type: 'error', text: 'গুগল অ্যাকাউন্টে সাইন-ইন করা নেই। অনুগ্রহ করে Sign In with Google করুন।' });
      return;
    }
    const validation = validatePassphrase(driveExportPassphrase);
    if (!validation.isValid) {
      setDriveExportError(validation.error || 'পাসফ্রেজ কমপক্ষে ৮ অক্ষরের হতে হবে।');
      return;
    }
    if (driveExportPassphrase !== driveExportPassphraseConfirm) {
      setDriveExportError('পাসফ্রেজ দুটি মিলছে না (Passphrases do not match)।');
      return;
    }

    setIsDriveEncrypting(true);
    setDriveExportError(null);

    try {
      const bundle = exportFullBackup();
      const encrypted = await encryptBackupBundle(bundle, driveExportPassphrase, driveExportHint);
      await updateUserDriveSyncStatus('pending');
      const result = await uploadBackupToGoogleDrive(googleAccessToken, encrypted, refreshGoogleAccessToken);
      setIsDriveEncrypting(false);
      setShowDriveEncryptedModal(false);
      setDriveExportPassphrase('');
      setDriveExportPassphraseConfirm('');
      setDriveExportHint('');

      if (result.success) {
        await updateUserDriveSyncStatus('synced', result.lastBackupAt);
        setDriveMsg({
          type: 'success',
          text: `আপনার এনক্রিপ্টেড লেজার ব্যাকআপ সফলভাবে Google Drive-এ সেভ করা হয়েছে! (${new Date().toLocaleTimeString('bn-BD')})`,
        });
      } else {
        await updateUserDriveSyncStatus('error');
        setDriveMsg({
          type: 'error',
          text: result.error || 'Google Drive-এ এনক্রিপ্টেড ব্যাকআপ সেভ করা যায়নি।',
        });
      }
    } catch (err: any) {
      setIsDriveEncrypting(false);
      setDriveExportError(err?.message || 'এনক্রিপ্ট করতে সমস্যা হয়েছে।');
    }
  };

  const handleExecuteDriveDecryptRestore = async () => {
    if (!driveEncryptedBundle) return;
    if (!driveDecryptPassphrase) {
      setDriveDecryptError('অনুগ্রহ করে পাসফ্রেজ দিন।');
      return;
    }

    setIsDriveDecrypting(true);
    setDriveDecryptError(null);

    try {
      const bundle = await decryptBackupBundle(driveEncryptedBundle, driveDecryptPassphrase);
      const res = restoreFromBackup(bundle);
      setIsDriveDecrypting(false);
      if (res.success) {
        setShowDriveDecryptModal(false);
        setDriveEncryptedBundle(null);
        setDriveDecryptPassphrase('');
        setRestoreSuccess(true);
        setDriveMsg({
          type: 'success',
          text: 'Google Drive এনক্রিপ্টেড ব্যাকআপ সফলভাবে ডিক্রিপ্ট ও রিস্টোর হয়েছে!',
        });
      } else {
        setDriveDecryptError(res.error || 'রিস্টোর করতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      setIsDriveDecrypting(false);
      setDriveDecryptError(err?.message || 'ডিক্রিপ্ট করতে ব্যর্থ হয়েছে। পাসফ্রেজ সঠিক কি না যাচাই করুন।');
    }
  };

  const handleExecuteEncryptedExport = async () => {
    const validation = validatePassphrase(exportPassphrase);
    if (!validation.isValid) {
      setExportCryptoError(validation.error || 'পাসফ্রেজ কমপক্ষে ৮ অক্ষরের হতে হবে।');
      return;
    }
    if (exportPassphrase !== exportPassphraseConfirm) {
      setExportCryptoError('পাসফ্রেজ দুটি মিলছে না (Passphrases do not match)।');
      return;
    }

    setIsEncryptingExport(true);
    setExportCryptoError(null);

    try {
      const bundle = exportFullBackup();
      const encrypted = await encryptBackupBundle(bundle, exportPassphrase, exportHint);
      const content = JSON.stringify(encrypted, null, 2);
      const filename = `money-canvas-encrypted-backup-${user.fullName.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.json`;
      downloadFile(filename, content, 'application/json');
      setShowEncryptedExportModal(false);
      setExportPassphrase('');
      setExportPassphraseConfirm('');
      setExportHint('');
    } catch (err: any) {
      setExportCryptoError(err?.message || 'এনক্রিপ্ট করতে সমস্যা হয়েছে।');
    } finally {
      setIsEncryptingExport(false);
    }
  };

  const handleDecryptLocalFile = async () => {
    if (!fileEncryptedBundle) return;
    if (!fileDecryptPassphrase) {
      setFileDecryptError('অনুগ্রহ করে পাসফ্রেজ দিন (Please enter passphrase).');
      return;
    }

    setIsDecryptingFile(true);
    setFileDecryptError(null);

    try {
      const bundle = await decryptBackupBundle(fileEncryptedBundle, fileDecryptPassphrase);
      setParsedBundle(bundle);
      setFileEncryptedBundle(null);
      setFileDecryptPassphrase('');
    } catch (err: any) {
      setFileDecryptError(err?.message || 'ভুল পাসফ্রেজ! ব্যাকআপ ফাইলটি ডিক্রিপ্ট করা যায়নি।');
    } finally {
      setIsDecryptingFile(false);
    }
  };

  const handleSaveToCloudVault = async () => {
    if (!activeUserId) {
      setVaultError('অনুগ্রহ করে প্রথমে অ্যাকাউন্টে লগইন করুন।');
      return;
    }
    const validation = validatePassphrase(vaultPassphrase);
    if (!validation.isValid) {
      setVaultError(validation.error || 'পাসফ্রেজ কমপক্ষে ৮ অক্ষরের হতে হবে।');
      return;
    }
    if (vaultPassphrase !== vaultPassphraseConfirm) {
      setVaultError('পাসফ্রেজ দুটি মিলছে না।');
      return;
    }

    setIsVaultOperating(true);
    setVaultError(null);

    try {
      const bundle = exportFullBackup();
      const encrypted = await encryptBackupBundle(bundle, vaultPassphrase, vaultHint);
      const res = await saveEncryptedBackupToFirestore(activeUserId, encrypted);
      setIsVaultOperating(false);
      if (res.success) {
        setShowCloudVaultModal(false);
        setVaultPassphrase('');
        setVaultPassphraseConfirm('');
        setVaultHint('');
        setCloudMsg({
          type: 'success',
          text: 'আপনার অ্যাকাউন্টের একটি পূর্ণাঙ্গ এনক্রিপ্টেড স্ন্যাপশট ক্লাউড ভল্টে সেভ করা হয়েছে!',
        });
      } else {
        setVaultError(res.error || 'ক্লাউড ভল্টে ব্যাকআপ সেভ করা যায়নি।');
      }
    } catch (err: any) {
      setIsVaultOperating(false);
      setVaultError(err?.message || 'এনক্রিপ্ট করতে সমস্যা হয়েছে।');
    }
  };

  const handleRestoreFromCloudVault = async () => {
    if (!activeUserId) return;
    if (!vaultPassphrase) {
      setVaultError('অনুগ্রহ করে পাসফ্রেজ দিন।');
      return;
    }

    setIsVaultOperating(true);
    setVaultError(null);

    try {
      const res = await fetchEncryptedBackupFromFirestore(activeUserId);
      if (!res.success || !res.encryptedBundle) {
        setIsVaultOperating(false);
        setVaultError(res.error || 'ক্লাউড ভল্টে কোনো ব্যাকআপ পাওয়া যায়নি।');
        return;
      }

      const bundle = await decryptBackupBundle(res.encryptedBundle, vaultPassphrase);
      const restoreRes = restoreFromBackup(bundle);
      setIsVaultOperating(false);
      if (restoreRes.success) {
        setShowCloudVaultModal(false);
        setVaultPassphrase('');
        setRestoreSuccess(true);
        setCloudMsg({
          type: 'success',
          text: 'ক্লাউড ভল্ট থেকে এনক্রিপ্টেড ব্যাকআপ সফলভাবে ডিক্রিপ্ট ও রিস্টোর হয়েছে!',
        });
      } else {
        setVaultError(restoreRes.error || 'রিস্টোর করতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      setIsVaultOperating(false);
      setVaultError(err?.message || 'ডিক্রিপ্ট করতে ব্যর্থ হয়েছে। পাসফ্রেজ সঠিক কি না যাচাই করুন।');
    }
  };

  const handleExportFullJson = () => {
    setIsExporting(true);
    setTimeout(() => {
      const bundle = exportFullBackup();
      const content = JSON.stringify(bundle, null, 2);
      const filename = `money-canvas-backup-${user.fullName.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.json`;
      downloadFile(filename, content, 'application/json');
      setIsExporting(false);
    }, 400);
  };

  const handleExportCsv = (type: 'accounts' | 'ledger' | 'trades' | 'dividends') => {
    const dateStr = new Date().toISOString().split('T')[0];
    if (type === 'accounts') {
      const csv = exportAccountsToCsv(accounts, accountBalances);
      downloadFile(`accounts-registry-${dateStr}.csv`, csv, 'text/csv');
    } else if (type === 'ledger') {
      const csv = exportTransactionsToCsv(transactions, transactionLines);
      downloadFile(`double-entry-ledger-${dateStr}.csv`, csv, 'text/csv');
    } else if (type === 'trades') {
      const csv = exportTradesToCsv(stockTransactions);
      downloadFile(`dse-stock-trades-${dateStr}.csv`, csv, 'text/csv');
    } else if (type === 'dividends') {
      const csv = exportDividendsToCsv(dividends);
      downloadFile(`dividends-portfolio-${dateStr}.csv`, csv, 'text/csv');
    }
  };

  const handleExportPdfStatement = (type: 'nbr_tax' | 'balance_sheet' | 'pnl' | 'valuation' | 'audit') => {
    if (type === 'nbr_tax') {
      const taxSummary = calculateCapitalGainsTaxSummary(stockTransactions, stocks, dividends, 0, '2025-2026', 5000000, 15);
      exportNbrTaxStatementPdf(
        user,
        {
          fiscalYear: '2025-2026',
          exemptionThreshold: 5000000,
          taxRatePct: 15,
          summary: {
            totalRealizedGain: taxSummary.totalRealizedGains,
            totalCapitalLoss: taxSummary.totalRealizedLosses,
            netRealizedGain: taxSummary.netCapitalGain,
            taxableGain: taxSummary.taxableCapitalGain,
            taxLiability: taxSummary.estimatedTaxLiability,
            totalAitCredits: taxSummary.totalAdvanceTaxCredits,
            netTaxPayableOrRefund: taxSummary.netTaxPayableOrRefund,
          },
          trades: taxSummary.gainItems.map((item) => ({
            id: item.id,
            stockSymbol: item.symbol,
            sellDate: item.tradeDate,
            quantity: item.quantity,
            saleValueNet: item.netProceeds,
            costBasisTotal: item.costBasis,
            gainOrLoss: item.realizedGainLoss,
            gainOrLossPct: item.gainLossPct,
            holdingPeriodDays: item.holdingType === 'long_term' ? 400 : 120,
            isApplicableFor15Percent: item.holdingType === 'long_term',
            taxTreatment: item.holdingType === 'long_term' ? 'long_term' : 'short_term',
            taxPayable: item.realizedGainLoss > 0 ? (item.realizedGainLoss * 0.15) : 0,
          })),
        },
        '2025-2026'
      );
    } else if (type === 'balance_sheet') {
      const bs = generateBalanceSheetReport(accountBalances, brokerCashBalances, stockHoldings, debts);
      const assetsItems = bs.currentAssetCategories.flatMap((cat) =>
        cat.items.map((it) => ({
          name: `${cat.categoryName} - ${it.name}`,
          amount: it.amount,
          code: it.details || '',
        }))
      ).concat(
        bs.nonCurrentAssetCategories.flatMap((cat) =>
          cat.items.map((it) => ({
            name: `${cat.categoryName} - ${it.name}`,
            amount: it.amount,
            code: it.details || '',
          }))
        )
      );

      const liabilitiesItems = bs.liabilityCategories.flatMap((cat) =>
        cat.items.map((it) => ({
          name: `${cat.categoryName} - ${it.name}`,
          amount: it.amount,
          code: it.details || '',
        }))
      );

      const equityItems = [
        { name: 'Retained Earnings & Cumulative Net Surplus', amount: bs.netWorth, code: 'EQ-3001' },
      ];

      exportBalanceSheetPdf(user, assetsItems, liabilitiesItems, equityItems, bs.totalAssets, bs.totalLiabilities, bs.netWorth, bs.asOfDate);
    } else if (type === 'pnl') {
      const pnl = generateIncomeStatementReport(transactions, transactionLines, categories, dividends, 0, '2026-01-01', '2026-12-31');
      const revenueItems = pnl.incomeCategories.map((c) => ({
        name: c.categoryName,
        amount: c.netAmount,
        code: 'INC-4000',
      }));
      const expenseItems = pnl.expenseCategories.map((c) => ({
        name: c.categoryName,
        amount: c.netAmount,
        code: 'EXP-5000',
      }));

      exportIncomeStatementPdf(user, revenueItems, expenseItems, pnl.totalIncome, pnl.totalExpenses, pnl.netSurplus, 'CY 2026');
    } else if (type === 'valuation') {
      exportPortfolioValuationPdf(user, stockHoldings, portfolioPerformanceMetrics, {
        dsexReturnPct: portfolioPerformanceMetrics.dsexTwrPct,
        alphaPct: portfolioPerformanceMetrics.alphaPct,
      });
    } else if (type === 'audit') {
      exportAuditReportPdf(user, auditLogs, true, auditLogs.length);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFile(file);
    setParseError(null);
    setRestoreSuccess(false);
    setFileEncryptedBundle(null);
    setFileDecryptPassphrase('');
    setFileDecryptError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);

        if (isEncryptedBackup(json)) {
          setFileEncryptedBundle(json);
          setParsedBundle(null);
          return;
        }

        if (!json.metadata || !json.data) {
          throw new Error('Invalid schema: Root object must contain "metadata" and "data" keys.');
        }

        if (!json.data.accounts || !json.data.transactions) {
          throw new Error('Incomplete ledger bundle: Missing core accounts or transactions tables.');
        }

        setParsedBundle(json as BackupBundle);
        setFileEncryptedBundle(null);
      } catch (err: any) {
        setParseError(err?.message || 'Failed to read or parse JSON file.');
        setParsedBundle(null);
        setFileEncryptedBundle(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = () => {
    if (!parsedBundle) return;
    const result = restoreFromBackup(parsedBundle);
    if (result.success) {
      setRestoreSuccess(true);
      setRestoreFile(null);
      setParsedBundle(null);
      setTimeout(() => setRestoreSuccess(false), 5000);
    } else {
      setParseError(result.error || 'Failed to apply backup.');
    }
  };

  const handleExecuteReset = () => {
    if (confirmResetText.trim() === 'CONFIRM RESET') {
      resetTenantLedger();
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
          <Database className="h-4 w-4" />
          <span>Data Lifecycle & Backup Portal</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Data Backup, Export & Restore
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Export full encrypted JSON snapshots, download granular CSV spreadsheets for tax and audit compliance, or restore past state.
        </p>
      </div>

      {/* Card 1: Real-Time Google Account Cloud Sync (Instant Mobile <-> Web) */}
      <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 relative overflow-hidden shadow-xl space-y-4">
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Cloud className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>রিয়েল-টাইম ক্লাউড সিঙ্ক (Google Account Cloud Sync)</span>
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                </h2>
                {isGoogleAuthenticated ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>সিঙ্ক সক্রিয় (Active)</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                    লোকাল মোড
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-xs mt-0.5 max-w-2xl leading-relaxed">
                <strong className="text-emerald-300">মোবাইল অ্যাপ ও কম্পিউটার ব্রাউজার সিঙ্ক:</strong> আপনি যে ডিভাইসেই একই গুগল অ্যাকাউন্ট দিয়ে লগইন করবেন, স্বয়ংক্রিয়ভাবে আপনার সমস্ত অ্যাকাউন্ট ব্যালেন্স, খরচ এবং পোর্টফোলিও সাথে সাথে পেয়ে যাবেন।
              </p>
            </div>
          </div>

          {!isGoogleAuthenticated ? (
            <button
              onClick={signInWithGoogle}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all shrink-0 cursor-pointer"
            >
              <GoogleIcon className="h-4 w-4 bg-white p-0.5 rounded-full shrink-0" />
              <span>Google দিয়ে সাইন-ইন করুন</span>
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={handleCloudSync}
                disabled={isCloudSyncingManual || cloudSyncStatus === 'syncing'}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${isCloudSyncingManual || cloudSyncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span>{isCloudSyncingManual ? 'সিঙ্ক হচ্ছে...' : 'এখনই সিঙ্ক করুন'}</span>
              </button>

              <button
                onClick={handleCloudRestore}
                disabled={isCloudRestoringManual}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                <CloudDownload className={`h-4 w-4 ${isCloudRestoringManual ? 'animate-spin text-emerald-400' : ''}`} />
                <span>{isCloudRestoringManual ? 'লোড হচ্ছে...' : 'ক্লাউড থেকে লোড করুন'}</span>
              </button>

              <button
                onClick={() => {
                  setVaultMode('export');
                  setVaultError(null);
                  setShowCloudVaultModal(true);
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>এনক্রিপ্টেড ক্লাউড ভল্ট</span>
              </button>
            </div>
          )}
        </div>

        {cloudMsg && (
          <div
            className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
              cloudMsg.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
            }`}
          >
            {cloudMsg.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{cloudMsg.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-lg text-slate-400">
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 uppercase font-mono">কানেক্টেড ইউজার</p>
              <p className="text-slate-200 font-semibold mt-0.5 truncate">{user.fullName}</p>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Smartphone className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 uppercase font-mono">মাল্টি-ডিভাইস সিঙ্ক</p>
              <p className="text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
                <span>মোবাইল ও ব্রাউজার কানেক্টেড</span>
              </p>
              <p className="text-[10px] text-slate-400">স্বয়ংক্রিয় ব্যাকগ্রাউন্ড সিঙ্ক</p>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Laptop className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 uppercase font-mono">সর্বশেষ ক্লাউড সিঙ্ক</p>
              <p className="text-slate-200 font-semibold mt-0.5">
                {lastCloudSyncAt
                  ? new Date(lastCloudSyncAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'এখনও সিঙ্ক করা হয়নি'}
              </p>
              <p className="text-[10px] text-emerald-400">Firebase Firestore Cloud</p>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Google Drive File Backup & Restore */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <HardDrive className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">Google Drive ফাইল ব্যাকআপ ও রিস্টোর (File Archive)</h2>
                {isGoogleAuthenticated && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Google Drive Active
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                আপনার ব্যক্তিগত গুগল ড্রাইভে ব্যাকআপ ফাইল (<code className="text-slate-300 font-mono">money_canvas_ledger_backup.json</code>) হিসেবে সেভ ও রিস্টোর করুন। মোবাইল এবং ব্রাউজার উভয়েই এই ফাইল অ্যাক্সেস করতে পারবে।
              </p>
            </div>
          </div>

          {!isGoogleAuthenticated ? (
            <button
              onClick={signInWithGoogle}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 shadow-lg transition-all shrink-0 cursor-pointer"
            >
              <GoogleIcon className="h-4 w-4 bg-white p-0.5 rounded-full shrink-0" />
              <span>Sign In with Google</span>
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={handleBackupToDrive}
                disabled={isDriveBackingUp}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                <CloudUpload className={`h-4 w-4 ${isDriveBackingUp ? 'animate-bounce' : ''}`} />
                <span>{isDriveBackingUp ? 'ড্রাইভে সেভ হচ্ছে...' : 'Backup to Drive'}</span>
              </button>

              <button
                onClick={() => {
                  setShowDriveEncryptedModal(true);
                  setDriveExportError(null);
                }}
                disabled={isDriveBackingUp}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                <Lock className="h-4 w-4" />
                <span>ড্রাইভ এনক্রিপ্ট ব্যাকআপ</span>
              </button>

              <button
                onClick={handleRestoreFromDrive}
                disabled={isDriveRestoring}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                <CloudDownload className={`h-4 w-4 ${isDriveRestoring ? 'animate-spin' : ''}`} />
                <span>{isDriveRestoring ? 'লোড হচ্ছে...' : 'Restore from Drive'}</span>
              </button>
            </div>
          )}
        </div>

        {driveMsg && (
          <div
            className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
              driveMsg.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
            }`}
          >
            {driveMsg.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{driveMsg.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <p className="text-[10px] text-slate-500 uppercase font-mono">ড্রাইভ ফাইল নেম</p>
            <p className="text-slate-200 font-semibold font-mono mt-0.5 text-[11px] truncate">money_canvas_ledger_backup.json</p>
            <p className="text-[10px] text-slate-400 truncate">Cross-Device Compatible</p>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <p className="text-[10px] text-slate-500 uppercase font-mono">Cloud Security</p>
            <p className="text-blue-400 font-semibold mt-0.5">100% Encrypted & Private</p>
            <p className="text-[10px] text-slate-400">Stored directly in your Google Drive</p>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <p className="text-[10px] text-slate-500 uppercase font-mono">Last Drive Backup</p>
            <p className="text-slate-200 font-semibold mt-0.5">
              {user.lastDriveBackupAt
                ? new Date(user.lastDriveBackupAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'No backup taken yet'}
            </p>
            <p className="text-[10px] text-slate-400">Google Drive API</p>
          </div>
        </div>
      </div>

      {restoreSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <div>
            <div className="font-bold text-white text-sm">Ledger State Restored Successfully!</div>
            <p className="text-slate-300 mt-0.5">
              All accounts, journal lines, investment holdings, loans, and audit records have been loaded.
            </p>
          </div>
        </div>
      )}

      {/* Grid: JSON Export & CSV Exports */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Complete JSON Backup Export */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <FileJson className="h-5 w-5 text-emerald-400" />
                <span>Full JSON System Backup</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Schema v5.0 Encapsulated
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Downloads a unified, portable JSON snapshot containing your entire financial graph — 
              accounts, double-entry transactions, loans, fixed deposits, stock portfolios, and cryptographic audit hashes.
            </p>

            <div className="rounded-lg bg-slate-950 p-4 border border-slate-800 text-xs font-mono space-y-2 text-slate-400">
              <div className="flex justify-between">
                <span>Active Tenant:</span>
                <span className="text-white font-medium">{user.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Accounts:</span>
                <span className="text-emerald-400">{accounts.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Journal Transactions:</span>
                <span className="text-emerald-400">{transactions.length}</span>
              </div>
              <div className="flex justify-between">
                <span>DSE Stock Trades:</span>
                <span className="text-emerald-400">{stockTransactions.length}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                onClick={handleExportFullJson}
                disabled={isExporting}
                className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold font-mono text-xs flex items-center justify-center gap-2 transition-colors border border-slate-700 disabled:opacity-50 cursor-pointer"
              >
                <Download className={`h-4 w-4 ${isExporting ? 'animate-bounce' : ''}`} />
                <span>{isExporting ? 'Packaging...' : 'Plain JSON Backup'}</span>
              </button>

              <button
                onClick={() => {
                  setShowEncryptedExportModal(true);
                  setExportCryptoError(null);
                }}
                className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
              >
                <Lock className="h-4 w-4" />
                <span>Encrypted Backup (AES-256)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Granular CSV Exports */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <FileSpreadsheet className="h-5 w-5 text-sky-400" />
                <span>Spreadsheet / CSV Exports</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">RFC-4180 Format</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-xs text-slate-300 leading-relaxed">
                Export specific ledgers to CSV format for Excel, Google Sheets, or accountant tax submission.
              </p>
              <a
                href="#/csv-import"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 text-xs font-semibold border border-sky-500/30 transition-all shrink-0 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5 text-sky-400" />
                <span>স্টেটমেন্ট ইমপোর্ট করুন</span>
              </a>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-white">Accounts & Balances</div>
                  <div className="text-[11px] text-slate-400">{accounts.length} accounts with live balances</div>
                </div>
                <button
                  onClick={() => handleExportCsv('accounts')}
                  className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-white">General Journal Ledger</div>
                  <div className="text-[11px] text-slate-400">{transactionLines.length} double-entry line items</div>
                </div>
                <button
                  onClick={() => handleExportCsv('ledger')}
                  className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-white">Stock Trades & Execution Log</div>
                  <div className="text-[11px] text-slate-400">{stockTransactions.length} buy/sell trade records</div>
                </div>
                <button
                  onClick={() => handleExportCsv('trades')}
                  className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-white">Dividends & Corporate Actions</div>
                  <div className="text-[11px] text-slate-400">{dividends.length} dividend payouts & tax credits</div>
                </div>
                <button
                  onClick={() => handleExportCsv('dividends')}
                  className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Official Financial PDF Statements & Reports */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <FileText className="h-5 w-5 text-rose-400" />
            <span>Official Financial PDF Statement Generation</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Vector Typography & Auto-Calculated Stamps
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Generate publication-grade PDF documents with official double-entry verification seals, tax assessment schedules, and cryptographic authenticity headers.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 pt-1">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="text-xs font-bold text-white">NBR Tax Schedule</div>
              <div className="text-[11px] text-slate-400 mt-1">Section 32/57 Capital Gains Return</div>
            </div>
            <button
              onClick={() => handleExportPdfStatement('nbr_tax')}
              className="w-full py-2 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Tax PDF</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="text-xs font-bold text-white">Balance Sheet</div>
              <div className="text-[11px] text-slate-400 mt-1">Statement of Financial Position</div>
            </div>
            <button
              onClick={() => handleExportPdfStatement('balance_sheet')}
              className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Balance Sheet PDF</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="text-xs font-bold text-white">Income Statement</div>
              <div className="text-[11px] text-slate-400 mt-1">P&L Operating Surplus & Margins</div>
            </div>
            <button
              onClick={() => handleExportPdfStatement('pnl')}
              className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>P&L PDF</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="text-xs font-bold text-white">DSE Valuation</div>
              <div className="text-[11px] text-slate-400 mt-1">Holdings, WAC & Return Analysis</div>
            </div>
            <button
              onClick={() => handleExportPdfStatement('valuation')}
              className="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Valuation PDF</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="text-xs font-bold text-white">Audit Certificate</div>
              <div className="text-[11px] text-slate-400 mt-1">Cryptographic Hash Seal Log</div>
            </div>
            <button
              onClick={() => handleExportPdfStatement('audit')}
              className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Audit PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Restore Section */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Upload className="h-5 w-5 text-amber-400" />
            <span>Restore Ledger from JSON Backup</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Pre-flight Validation Enabled</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".json"
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-950/50"
            >
              <Upload className="h-8 w-8 text-slate-500 mx-auto mb-3" />
              <div className="text-xs font-semibold text-white">
                {restoreFile ? restoreFile.name : 'Click to select JSON backup file'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Accepts .json backup files generated by FinOS Master v5
              </p>
            </div>

            {parseError && (
              <div className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{parseError}</span>
              </div>
            )}
          </div>

          <div className="lg:col-span-6 space-y-4">
            {parsedBundle ? (
              <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-emerald-400 font-semibold border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Valid Backup Verified</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Schema {parsedBundle.metadata.schemaVersion}</span>
                </div>

                <div className="space-y-1.5 text-slate-300 text-[11px]">
                  <div>Original Owner: <span className="text-white">{parsedBundle.metadata.userFullName}</span></div>
                  <div>Export Timestamp: <span className="text-slate-400">{parsedBundle.metadata.exportedAt}</span></div>
                  <div>Accounts Included: <span className="text-emerald-400">{parsedBundle.metadata.recordCounts.accounts || 0}</span></div>
                  <div>Transactions Included: <span className="text-emerald-400">{parsedBundle.metadata.recordCounts.transactions || 0}</span></div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleExecuteRestore}
                    className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Apply & Overwrite Current Tenant State</span>
                  </button>
                </div>
              </div>
            ) : fileEncryptedBundle ? (
              <div className="rounded-lg bg-slate-950 border border-amber-500/40 p-4 space-y-3.5 font-mono text-xs">
                <div className="flex items-center justify-between text-amber-400 font-semibold border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-4 w-4" />
                    <span>এনক্রিপ্টেড ব্যাকআপ ডিটেক্টেড (AES-GCM)</span>
                  </span>
                  <span className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20">
                    256-bit PBKDF2
                  </span>
                </div>

                <div className="space-y-1 text-slate-300 text-[11px]">
                  {fileEncryptedBundle.userFullName && (
                    <div>ব্যবহারকারী: <span className="text-white font-medium">{fileEncryptedBundle.userFullName}</span></div>
                  )}
                  <div>এক্সপোর্ট তারিখ: <span className="text-slate-400">{new Date(fileEncryptedBundle.exportedAt).toLocaleString('bn-BD')}</span></div>
                  {fileEncryptedBundle.hint && (
                    <div className="p-2 rounded bg-amber-950/20 border border-amber-500/20 text-amber-200 text-[11px] flex items-center gap-1.5 mt-2">
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                      <span>পাসফ্রেজ হিন্ট: <strong>{fileEncryptedBundle.hint}</strong></span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-1 font-sans">
                  <label className="text-[11px] text-slate-400 block">এই ব্যাকআপ ফাইলটি আনলক করতে পাসফ্রেজ দিন:</label>
                  <div className="relative font-mono">
                    <input
                      type={showFileDecryptPassword ? 'text' : 'password'}
                      value={fileDecryptPassphrase}
                      onChange={(e) => setFileDecryptPassphrase(e.target.value)}
                      placeholder="পাসফ্রেজ লিখুন..."
                      className="w-full px-3 py-2 pr-10 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleDecryptLocalFile();
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowFileDecryptPassword(!showFileDecryptPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showFileDecryptPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {fileDecryptError && (
                    <div className="p-2 rounded bg-rose-950/30 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{fileDecryptError}</span>
                    </div>
                  )}

                  <button
                    onClick={handleDecryptLocalFile}
                    disabled={isDecryptingFile || !fileDecryptPassphrase}
                    className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <Unlock className={`h-4 w-4 ${isDecryptingFile ? 'animate-spin' : ''}`} />
                    <span>{isDecryptingFile ? 'ডিক্রিপ্ট হচ্ছে...' : 'ডিক্রিপ্ট ও আনলক করুন'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-slate-950/40 border border-slate-800/60 p-6 text-center text-xs text-slate-500 font-mono flex flex-col items-center justify-center h-full">
                <Shield className="h-6 w-6 text-slate-600 mb-2" />
                <span>Select a plain or AES-GCM encrypted backup file to inspect record contents before applying.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone: Factory Reset */}
      <div className="rounded-xl border border-rose-900/40 bg-rose-950/10 p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-rose-400">
          <AlertTriangle className="h-5 w-5 text-rose-400" />
          <span>Danger Zone: Hard Tenant Factory Reset</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
          Permanently wipes all local accounts, transactions, investments, and audit records for the active tenant profile. 
          The application will return to a clean initial state. This action cannot be undone.
        </p>

        {!showResetModal ? (
          <button
            onClick={() => setShowResetModal(true)}
            className="px-4 py-2 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-mono font-semibold flex items-center gap-2 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Reset Tenant Data</span>
          </button>
        ) : (
          <div className="p-4 rounded-lg bg-slate-950 border border-rose-500/50 space-y-3 max-w-md font-mono text-xs">
            <div className="text-rose-400 font-semibold">
              Type "CONFIRM RESET" to purge active tenant:
            </div>
            <input
              type="text"
              value={confirmResetText}
              onChange={(e) => setConfirmResetText(e.target.value)}
              placeholder="CONFIRM RESET"
              className="w-full px-3 py-2 rounded border border-slate-800 bg-slate-900 text-white font-mono text-xs focus:outline-none focus:border-rose-500"
            />
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleExecuteReset}
                disabled={confirmResetText.trim() !== 'CONFIRM RESET'}
                className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-colors disabled:opacity-30"
              >
                Permanently Purge
              </button>
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setConfirmResetText('');
                }}
                className="px-3 py-1.5 rounded text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Encrypted JSON File Export */}
      {showEncryptedExportModal && (
        <Modal
          isOpen={showEncryptedExportModal}
          onClose={() => {
            setShowEncryptedExportModal(false);
            setExportCryptoError(null);
          }}
          title={
            <div className="flex items-center gap-2 text-white">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span>এনক্রিপ্টেড ব্যাকআপ এক্সপোর্ট (AES-GCM-256)</span>
            </div>
          }
          description="আপনার সমস্ত আর্থিক রেকর্ড 256-বিট এইএস এনক্রিপশন ও পাসফ্রেজ দিয়ে সুরক্ষিত করে ডাউনলোড করুন।"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs leading-relaxed space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                <span>জিরো-নলেজ সিকিউরিটি নোটিশ (Zero-Knowledge Privacy)</span>
              </div>
              <p>
                আপনার পাসফ্রেজ কোনো সার্ভারে পাঠানো বা সংরক্ষণ করা হয় না। <strong>পাসফ্রেজ ভুলে গেলে এই ফাইলটি পুনরুদ্ধার করার কোনো উপায় নেই।</strong>
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>পাসফ্রেজ তৈরি করুন (কমপক্ষে ৮ অক্ষর):</span>
                {exportPassphrase && (
                  <span
                    className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded ${
                      validatePassphrase(exportPassphrase).strength === 'strong'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : validatePassphrase(exportPassphrase).strength === 'medium'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {validatePassphrase(exportPassphrase).strength === 'strong'
                      ? 'শক্তিশালী (Strong)'
                      : validatePassphrase(exportPassphrase).strength === 'medium'
                      ? 'মাঝারি (Medium)'
                      : 'দুর্বল (Weak)'}
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showExportPassword ? 'text' : 'password'}
                  value={exportPassphrase}
                  onChange={(e) => setExportPassphrase(e.target.value)}
                  placeholder="শক্তিশালী পাসফ্রেজ লিখুন..."
                  className="w-full px-3 py-2.5 pr-10 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowExportPassword(!showExportPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showExportPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">পাসফ্রেজ নিশ্চিত করুন:</label>
              <input
                type={showExportPassword ? 'text' : 'password'}
                value={exportPassphraseConfirm}
                onChange={(e) => setExportPassphraseConfirm(e.target.value)}
                placeholder="পুনরায় পাসফ্রেজ লিখুন..."
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>পাসফ্রেজ হিন্ট (ঐচ্ছিক):</span>
                <span className="text-[10px] text-slate-500">ফাইলে দেখা যাবে</span>
              </label>
              <input
                type="text"
                value={exportHint}
                onChange={(e) => setExportHint(e.target.value)}
                placeholder="যেমন: প্রিয় বইয়ের নাম ও বিশেষ সাল..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            {exportCryptoError && (
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{exportCryptoError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowEncryptedExportModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleExecuteEncryptedExport}
                disabled={isEncryptingExport || !exportPassphrase || !exportPassphraseConfirm}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                <Lock className={`h-4 w-4 ${isEncryptingExport ? 'animate-spin' : ''}`} />
                <span>{isEncryptingExport ? 'এনক্রিপ্ট হচ্ছে...' : 'এনক্রিপ্ট ও ডাউনলোড করুন'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: Google Drive Encrypted Backup Modal */}
      {showDriveEncryptedModal && (
        <Modal
          isOpen={showDriveEncryptedModal}
          onClose={() => {
            setShowDriveEncryptedModal(false);
            setDriveExportError(null);
          }}
          title={
            <div className="flex items-center gap-2 text-white">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <CloudUpload className="h-5 w-5" />
              </div>
              <span>Google Drive এনক্রিপ্টেড ব্যাকআপ</span>
            </div>
          }
          description="আপনার লেজার ব্যাকআপটিকে ড্রাইভের ক্লাউডে আপলোডের পূর্বে ব্রাউজারে পাসফ্রেজ দিয়ে এনক্রিপ্ট করুন।"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs leading-relaxed space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                <span>নিরাপত্তা সতর্কতা</span>
              </div>
              <p>
                ড্রাইভে সংরক্ষিত এই ফাইলটি খোলার জন্য আপনাকে এই পাসফ্রেজটি দিতে হবে। পাসফ্রেজ ভুলে গেলে ড্রাইভের ফাইলটি অকেজো হয়ে পড়বে।
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">পাসফ্রেজ তৈরি করুন (কমপক্ষে ৮ অক্ষর):</label>
              <div className="relative">
                <input
                  type={showDriveExportPassword ? 'text' : 'password'}
                  value={driveExportPassphrase}
                  onChange={(e) => setDriveExportPassphrase(e.target.value)}
                  placeholder="পাসফ্রেজ..."
                  className="w-full px-3 py-2.5 pr-10 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowDriveExportPassword(!showDriveExportPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showDriveExportPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">পাসফ্রেজ নিশ্চিত করুন:</label>
              <input
                type={showDriveExportPassword ? 'text' : 'password'}
                value={driveExportPassphraseConfirm}
                onChange={(e) => setDriveExportPassphraseConfirm(e.target.value)}
                placeholder="পুনরায় পাসফ্রেজ..."
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">পাসফ্রেজ হিন্ট (ঐচ্ছিক):</label>
              <input
                type="text"
                value={driveExportHint}
                onChange={(e) => setDriveExportHint(e.target.value)}
                placeholder="যেমন: অফিস পাসকোড..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            {driveExportError && (
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{driveExportError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDriveEncryptedModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleExecuteDriveEncryptedBackup}
                disabled={isDriveEncrypting || !driveExportPassphrase || !driveExportPassphraseConfirm}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                <CloudUpload className={`h-4 w-4 ${isDriveEncrypting ? 'animate-bounce' : ''}`} />
                <span>{isDriveEncrypting ? 'এনক্রিপ্ট ও আপলোড হচ্ছে...' : 'এনক্রিপ্ট করে ড্রাইভে সেভ'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: Google Drive Decrypt and Restore Modal */}
      {showDriveDecryptModal && (
        <Modal
          isOpen={showDriveDecryptModal}
          onClose={() => {
            setShowDriveDecryptModal(false);
            setDriveDecryptError(null);
          }}
          title={
            <div className="flex items-center gap-2 text-white">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Lock className="h-5 w-5" />
              </div>
              <span>Google Drive এনক্রিপ্টেড ব্যাকআপ আনলক</span>
            </div>
          }
          description="আপনার Google Drive-এ সংরক্ষিত ফাইলটি পাসফ্রেজ দিয়ে এনক্রিপ্ট করা রয়েছে।"
        >
          <div className="space-y-4">
            {driveEncryptedBundle?.hint && (
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                <span>
                  পাসফ্রেজ হিন্ট: <strong>{driveEncryptedBundle.hint}</strong>
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">পাসফ্রেজ লিখুন:</label>
              <div className="relative">
                <input
                  type={showDriveDecryptPassword ? 'text' : 'password'}
                  value={driveDecryptPassphrase}
                  onChange={(e) => setDriveDecryptPassphrase(e.target.value)}
                  placeholder="পাসফ্রেজ লিখুন..."
                  className="w-full px-3 py-2.5 pr-10 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleExecuteDriveDecryptRestore();
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowDriveDecryptPassword(!showDriveDecryptPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showDriveDecryptPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {driveDecryptError && (
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{driveDecryptError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDriveDecryptModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleExecuteDriveDecryptRestore}
                disabled={isDriveDecrypting || !driveDecryptPassphrase}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                <Unlock className={`h-4 w-4 ${isDriveDecrypting ? 'animate-spin' : ''}`} />
                <span>{isDriveDecrypting ? 'ডিক্রিপ্ট হচ্ছে...' : 'ডিক্রিপ্ট ও রিস্টোর করুন'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 4: Cloud Vault (Firestore Encrypted Backup) */}
      {showCloudVaultModal && (
        <Modal
          isOpen={showCloudVaultModal}
          onClose={() => {
            setShowCloudVaultModal(false);
            setVaultError(null);
          }}
          title={
            <div className="flex items-center gap-2 text-white">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span>ক্লাউড এনক্রিপ্টেড ভল্ট (Firestore Vault)</span>
            </div>
          }
          description="ক্লাউডে আপনার আর্থিক তথ্যের একটি শূন্য-জ্ঞান (Zero-Knowledge) এনক্রিপ্টেড স্ন্যাপশট সংরক্ষণ বা পুনরুদ্ধার করুন।"
        >
          <div className="space-y-4">
            {/* Mode Switcher */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setVaultMode('export');
                  setVaultError(null);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  vaultMode === 'export'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ভল্টে ব্যাকআপ রাখুন
              </button>
              <button
                type="button"
                onClick={() => {
                  setVaultMode('restore');
                  setVaultError(null);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  vaultMode === 'restore'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ভল্ট থেকে রিস্টোর করুন
              </button>
            </div>

            {vaultMode === 'export' ? (
              <div className="space-y-3.5">
                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs">
                  ভল্টে সংরক্ষিত ডেটা আপনার ব্রাউজারেই AES-GCM দিয়ে এনক্রিপ্ট হয়ে ক্লাউডে পৌঁছায়। পাসফ্রেজ হারিয়ে গেলে এই ডেটা আর কোনোভাবেই উদ্ধার করা সম্ভব নয়।
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">ভল্ট পাসফ্রেজ (কমপক্ষে ৮ অক্ষর):</label>
                  <div className="relative">
                    <input
                      type={showVaultPassword ? 'text' : 'password'}
                      value={vaultPassphrase}
                      onChange={(e) => setVaultPassphrase(e.target.value)}
                      placeholder="পাসফ্রেজ..."
                      className="w-full px-3 py-2.5 pr-10 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowVaultPassword(!showVaultPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showVaultPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">পাসফ্রেজ নিশ্চিত করুন:</label>
                  <input
                    type={showVaultPassword ? 'text' : 'password'}
                    value={vaultPassphraseConfirm}
                    onChange={(e) => setVaultPassphraseConfirm(e.target.value)}
                    placeholder="পুনরায় পাসফ্রেজ..."
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">পাসফ্রেজ হিন্ট (ঐচ্ছিক):</label>
                  <input
                    type="text"
                    value={vaultHint}
                    onChange={(e) => setVaultHint(e.target.value)}
                    placeholder="হিন্ট..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <p className="text-xs text-slate-300">
                  ক্লাউড ভল্ট থেকে ডেটা নামিয়ে ডিক্রিপ্ট করতে ভল্ট তৈরির সময় ব্যবহৃত পাসফ্রেজটি লিখুন:
                </p>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">ভল্ট পাসফ্রেজ:</label>
                  <div className="relative">
                    <input
                      type={showVaultPassword ? 'text' : 'password'}
                      value={vaultPassphrase}
                      onChange={(e) => setVaultPassphrase(e.target.value)}
                      placeholder="পাসফ্রেজ..."
                      className="w-full px-3 py-2.5 pr-10 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRestoreFromCloudVault();
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowVaultPassword(!showVaultPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showVaultPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {vaultError && (
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{vaultError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCloudVaultModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                বাতিল
              </button>
              {vaultMode === 'export' ? (
                <button
                  type="button"
                  onClick={handleSaveToCloudVault}
                  disabled={isVaultOperating || !vaultPassphrase || !vaultPassphraseConfirm}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  <Lock className={`h-4 w-4 ${isVaultOperating ? 'animate-spin' : ''}`} />
                  <span>{isVaultOperating ? 'ভল্টে সেভ হচ্ছে...' : 'ভল্টে এনক্রিপ্ট করে সেভ'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRestoreFromCloudVault}
                  disabled={isVaultOperating || !vaultPassphrase}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  <Unlock className={`h-4 w-4 ${isVaultOperating ? 'animate-spin' : ''}`} />
                  <span>{isVaultOperating ? 'ডিক্রিপ্ট হচ্ছে...' : 'ডিক্রিপ্ট ও রিস্টোর করুন'}</span>
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
