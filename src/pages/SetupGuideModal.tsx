import React, { useState } from 'react';
import { Modal } from '../components/common/Modal';
import { Copy, Check, Terminal, Database, Key, ShieldCheck, ExternalLink } from 'lucide-react';
import { useToast } from '../components/common/Toast';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    showToast('Copied to Clipboard', `${label} copied successfully!`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const sqlPromotionSnippet = `-- Run this in Supabase SQL Editor after manually creating your first user in Auth:
UPDATE public.profiles
SET role = 'super_admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@EXAMPLE.COM');`;

  const edgeDeployCmd = `# 1. Login to Supabase CLI
supabase login

# 2. Link your local project to Supabase
supabase link --project-ref your-project-id

# 3. Deploy the admin user management Edge Function
supabase functions deploy admin-create-user --no-verify-jwt`;

  const envTemplate = `VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_CURRENCY_SYMBOL=₹`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Supabase & App Setup Guide"
      subtitle="Complete step-by-step instructions to connect your live Supabase project"
      maxWidth="2xl"
    >
      <div className="space-y-6 text-sm text-slate-700">
        {/* Step 1 */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">
              1
            </span>
            <h4>Create Supabase Project & Run SQL Schema</h4>
          </div>
          <p className="text-xs text-slate-600 pl-8">
            Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-brand-600 font-semibold underline inline-flex items-center gap-0.5">supabase.com <ExternalLink className="w-3 h-3" /></a>, create a new project, open the <strong>SQL Editor</strong>, and execute the full migration script located in <code className="bg-slate-200/80 px-1 py-0.5 rounded text-slate-800">supabase/schema.sql</code>.
          </p>
          <div className="pl-8 pt-1">
            <p className="text-[11px] text-emerald-700 font-medium">
              ✓ Includes PostgreSQL <code className="bg-emerald-100 px-1 rounded">btree_gist</code> extension, half-open exclusion constraints preventing double bookings, automatic activity audit triggers, and Row Level Security on all 9 tables.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">
              2
            </span>
            <h4>Create the First Auth User & Promote to Super Admin</h4>
          </div>
          <p className="text-xs text-slate-600 pl-8">
            In Supabase Dashboard → <strong>Authentication → Users</strong>, click <strong>"Add User"</strong> (Create user with your email & password). Then run this SQL snippet in the SQL Editor:
          </p>
          <div className="pl-8 pt-1">
            <div className="relative bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-xs overflow-x-auto">
              <button
                onClick={() => copyToClipboard(sqlPromotionSnippet, 'SQL Promotion Snippet')}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1 text-[11px]"
              >
                {copiedKey === 'SQL Promotion Snippet' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy</span>
              </button>
              <pre>{sqlPromotionSnippet}</pre>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">
              3
            </span>
            <h4>Deploy the admin-create-user Edge Function</h4>
          </div>
          <p className="text-xs text-slate-600 pl-8">
            The Edge Function creates new staff users securely using the Supabase Service Role Key without exposing it to the frontend. Deploy with Supabase CLI:
          </p>
          <div className="pl-8 pt-1">
            <div className="relative bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-xs overflow-x-auto">
              <button
                onClick={() => copyToClipboard(edgeDeployCmd, 'Edge Function Deploy Command')}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1 text-[11px]"
              >
                {copiedKey === 'Edge Function Deploy Command' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy</span>
              </button>
              <pre>{edgeDeployCmd}</pre>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">
              4
            </span>
            <h4>Set Local .env Credentials & Run the App</h4>
          </div>
          <p className="text-xs text-slate-600 pl-8">
            Copy your project credentials from <strong>Project Settings → API</strong> into your <code className="bg-slate-200/80 px-1 py-0.5 rounded text-slate-800">.env</code> file:
          </p>
          <div className="pl-8 pt-1">
            <div className="relative bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-xs overflow-x-auto">
              <button
                onClick={() => copyToClipboard(envTemplate, '.env Configuration')}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1 text-[11px]"
              >
                {copiedKey === '.env Configuration' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy</span>
              </button>
              <pre>{envTemplate}</pre>
            </div>
          </div>
        </div>

        <div className="text-center pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
          >
            Got It! Close Guide
          </button>
        </div>
      </div>
    </Modal>
  );
};
