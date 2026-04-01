import React, { useState } from 'react';
import { Github, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface GitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: Record<string, string>;
  projectName: string;
}

export function GitHubModal({ isOpen, onClose, files, projectName }: GitHubModalProps) {
  const [token, setToken] = useState('');
  const [repoName, setRepoName] = useState(projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
  const [commitMessage, setCommitMessage] = useState('Initial commit from AI Studio');
  const [isPushing, setIsPushing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [repoUrl, setRepoUrl] = useState('');

  if (!isOpen) return null;

  const handlePush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !repoName) return;

    setIsPushing(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      // 1. Get user info
      const userRes = await fetch('https://api.github.com/user', {
        headers: { Authorization: `token ${token}` }
      });
      if (!userRes.ok) throw new Error('Invalid GitHub token');
      const user = await userRes.json();

      // 2. Create repo
      const createRepoRes = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: repoName,
          description: 'Created with AI Studio',
          private: false,
          auto_init: true,
        }),
      });
      
      let repo = await createRepoRes.json();
      
      // If repo exists, we'll just use it
      if (createRepoRes.status === 422 && repo.errors?.[0]?.message === 'name already exists on this account') {
        repo = { full_name: `${user.login}/${repoName}`, html_url: `https://github.com/${user.login}/${repoName}` };
      } else if (!createRepoRes.ok) {
        throw new Error(repo.message || 'Failed to create repository');
      }

      setRepoUrl(repo.html_url);

      // 3. Get latest commit SHA
      const refRes = await fetch(`https://api.github.com/repos/${repo.full_name}/git/refs/heads/main`, {
        headers: { Authorization: `token ${token}` }
      });
      
      let baseTreeSha;
      let latestCommitSha;
      
      if (refRes.ok) {
        const refData = await refRes.json();
        latestCommitSha = refData.object.sha;
        
        const commitRes = await fetch(`https://api.github.com/repos/${repo.full_name}/git/commits/${latestCommitSha}`, {
          headers: { Authorization: `token ${token}` }
        });
        const commitData = await commitRes.json();
        baseTreeSha = commitData.tree.sha;
      }

      // 4. Create tree
      const tree = Object.entries(files).map(([path, content]) => ({
        path,
        mode: '100644',
        type: 'blob',
        content,
      }));

      const createTreeRes = await fetch(`https://api.github.com/repos/${repo.full_name}/git/trees`, {
        method: 'POST',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree,
        }),
      });
      if (!createTreeRes.ok) throw new Error('Failed to create git tree');
      const treeData = await createTreeRes.json();

      // 5. Create commit
      const createCommitRes = await fetch(`https://api.github.com/repos/${repo.full_name}/git/commits`, {
        method: 'POST',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: commitMessage,
          tree: treeData.sha,
          parents: latestCommitSha ? [latestCommitSha] : [],
        }),
      });
      if (!createCommitRes.ok) throw new Error('Failed to create commit');
      const commitData = await createCommitRes.json();

      // 6. Update ref
      const updateRefRes = await fetch(`https://api.github.com/repos/${repo.full_name}/git/refs/heads/main`, {
        method: 'PATCH',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sha: commitData.sha,
          force: true,
        }),
      });
      
      // If main doesn't exist, try master
      if (!updateRefRes.ok) {
         await fetch(`https://api.github.com/repos/${repo.full_name}/git/refs/heads/master`, {
          method: 'PATCH',
          headers: {
            Authorization: `token ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sha: commitData.sha,
            force: true,
          }),
        });
      }

      setStatus('success');
    } catch (error: any) {
      console.error('GitHub push error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'An unexpected error occurred');
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Github className="w-5 h-5" />
            Push to GitHub
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {status === 'success' ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Successfully Pushed!</h3>
              <p className="text-zinc-400 text-sm mb-6">
                Your code has been pushed to GitHub.
              </p>
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                View Repository
              </a>
            </div>
          ) : (
            <form onSubmit={handlePush} className="space-y-4">
              {status === 'error' && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{errorMessage}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Personal Access Token
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Needs 'repo' scope. Tokens are not stored and only used for this request.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Repository Name
                </label>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Commit Message
                </label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPushing || !token || !repoName}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isPushing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Pushing to GitHub...
                    </>
                  ) : (
                    <>
                      <Github className="w-4 h-4" />
                      Push Repository
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
