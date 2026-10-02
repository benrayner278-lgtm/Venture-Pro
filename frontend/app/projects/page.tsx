'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';

interface Project {
  id: string;
  businessName: string;
  description: string;
  niche: string;
  createdAt: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProject, setNewProject] = useState({ businessName: '', description: '', niche: '' });

  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  useEffect(() => {
    const fetchProjects = async () => {
      if (!userId) return;

      try {
        const response = await fetch(`http://localhost:3001/api/projects?userId=${userId}`);
        const data = await response.json();
        setProjects(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [userId]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setCreating(true);

    try {
      const response = await fetch('http://localhost:3001/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          businessName: newProject.businessName || 'Untitled Project',
          niche: newProject.niche,
          description: newProject.description,
        }),
      });

      if (response.ok) {
        const createdProject = await response.json();
        setProjects([createdProject, ...projects]);
        setShowNewForm(false);
        setNewProject({ businessName: '', description: '', niche: '' });
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!userId || !confirm('Are you sure you want to delete this project?')) return;

    try {
      const response = await fetch(`http://localhost:3001/api/projects/${projectId}?userId=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setProjects(projects.filter((p) => p.id !== projectId));
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-gray-900 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-900/50 border-b border-gray-800/50 px-8 py-5 shadow-lg backdrop-blur-sm flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Projects</h1>
            <p className="text-gray-400 text-sm font-medium mt-1">Manage your business ideas</p>
          </div>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition font-semibold text-sm shadow-lg"
          >
            + New Project
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {/* New Project Form */}
          {showNewForm && (
            <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6 mb-8 max-w-2xl">
              <h2 className="text-xl font-bold text-white mb-4">Create New Project</h2>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Business Name"
                    value={newProject.businessName}
                    onChange={(e) => setNewProject({ ...newProject, businessName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition placeholder-gray-500"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Industry/Niche"
                    value={newProject.niche}
                    onChange={(e) => setNewProject({ ...newProject, niche: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition placeholder-gray-500"
                  />
                </div>
                <div>
                  <textarea
                    placeholder="Description (optional)"
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition placeholder-gray-500 resize-none h-24"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={creating}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition font-semibold text-sm disabled:opacity-60"
                  >
                    {creating ? 'Creating...' : 'Create Project'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewForm(false)}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2.5 rounded-lg transition font-semibold text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Projects List */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-gray-400">Loading projects...</div>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg mb-4">No projects yet</p>
              <button
                onClick={() => setShowNewForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition font-semibold text-sm"
              >
                Create Your First Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6 hover:bg-gray-900 hover:border-gray-700 transition flex flex-col"
                >
                  <h3 className="text-lg font-bold text-white mb-1">{project.businessName || 'Untitled'}</h3>
                  <p className="text-sm text-gray-400 mb-3">{project.niche || 'No niche specified'}</p>
                  <p className="text-gray-300 text-sm mb-4 line-clamp-2 flex-1">{project.description || 'No description'}</p>
                  <div className="flex justify-between items-center pt-4 border-t border-gray-800/50 gap-2">
                    <p className="text-xs text-gray-500">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard?projectId=${project.id}`}
                        className="text-blue-400 hover:text-blue-300 text-xs font-semibold px-2 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 transition"
                      >
                        Chat
                      </Link>
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="text-red-400 hover:text-red-300 text-xs font-semibold px-2 py-1 rounded bg-red-600/20 hover:bg-red-600/30 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
