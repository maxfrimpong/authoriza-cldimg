import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { RequestStatus, Role, User, SystemLists } from '../types';
import { Users, LayoutDashboard, UserPlus, X, Shield, Briefcase, Mail, Key, Edit2, Settings, Upload, Image as ImageIcon, Plus, Trash2, List, Save, XCircle, Undo2, ToggleLeft, ToggleRight, Type, Music, Phone } from 'lucide-react';

const ListManager = ({ title, items = [], onUpdate }: { title: string, items: string[], onUpdate: (newItems: string[]) => void }) => {
    const [newItem, setNewItem] = useState('');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');
    
    // Undo State
    const [deletedItem, setDeletedItem] = useState<{ val: string, idx: number } | null>(null);
    const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleAdd = () => {
        const trimmed = newItem.trim();
        if (trimmed && !items.includes(trimmed)) {
            onUpdate([...items, trimmed]);
            setNewItem('');
        }
    };

    const handleDelete = (index: number) => {
        const itemToDelete = items[index];
        
        // Create a copy and splice to remove the item at the specific index
        const newItems = [...items];
        newItems.splice(index, 1);
        onUpdate(newItems);

        // Set undo state
        setDeletedItem({ val: itemToDelete, idx: index });

        // Clear existing timeout
        if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);

        // Auto-dismiss undo after 5 seconds
        undoTimeoutRef.current = setTimeout(() => {
            setDeletedItem(null);
        }, 5000);
    };

    const handleUndo = () => {
        if (deletedItem) {
            const newItems = [...items];
            // Restore item to its original index (safe even if index is OOB, splice appends)
            newItems.splice(deletedItem.idx, 0, deletedItem.val);
            onUpdate(newItems);
            
            // Clear undo state
            setDeletedItem(null);
            if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
        }
    };

    const startEdit = (index: number, currentValue: string) => {
        setEditingIndex(index);
        setEditValue(currentValue);
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setEditValue('');
    };

    const saveEdit = (index: number) => {
        const trimmed = editValue.trim();
        if (trimmed) {
             // Check for duplicates, but allow if it's the same item being edited (no change)
             const isDuplicate = items.some((item, i) => i !== index && item.toLowerCase() === trimmed.toLowerCase());
             
             if (isDuplicate) {
                 alert('This item already exists in the list.');
                 return;
             }

             const newItems = [...items];
             newItems[index] = trimmed;
             onUpdate(newItems);
             setEditingIndex(null);
             setEditValue('');
        }
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
        };
    }, []);

    return (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col h-full transition-all text-gray-900">
            <h4 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide flex items-center">
                <List size={14} className="mr-2" /> {title}
            </h4>
            
            {/* Undo Notification */}
            {deletedItem && (
                <div className="mb-3 bg-gray-800 text-white text-xs py-2 px-3 rounded shadow-md flex justify-between items-center animate-in fade-in slide-in-from-top-2">
                    <span className="truncate mr-2">Deleted <span className="font-semibold">"{deletedItem.val}"</span></span>
                    <button 
                        type="button"
                        onClick={handleUndo} 
                        className="flex items-center font-bold text-brand-teal hover:text-white shrink-0 transition-colors"
                    >
                        <Undo2 size={14} className="mr-1"/> Undo
                    </button>
                </div>
            )}

            {/* Add Item Input */}
            <div className="flex space-x-2 mb-3">
                <input 
                    type="text" 
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder="Add new item..."
                    className="flex-1 text-sm border-gray-300 rounded focus:ring-brand-teal focus:border-brand-teal px-2 py-1 bg-white"
                />
                <button 
                    type="button"
                    onClick={handleAdd}
                    className="bg-brand-teal text-white p-1.5 rounded hover:bg-[#008f7a] transition-colors"
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* List Items */}
            <div className="flex-1 overflow-y-auto max-h-40 space-y-1 pr-1 custom-scrollbar">
                {items.length === 0 && <p className="text-xs text-gray-400 italic">No items yet.</p>}
                {items.map((item, index) => (
                    // Using item as key assuming uniqueness, which handleAdd enforces
                    <div key={item} className="flex justify-between items-center bg-white p-2 rounded border border-gray-100 text-sm group min-h-[40px] hover:border-gray-300 transition-colors">
                        {editingIndex === index ? (
                            <div className="flex flex-1 items-center space-x-2">
                                <input 
                                    type="text" 
                                    autoFocus
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="flex-1 text-sm border-brand-teal rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-teal"
                                />
                                <button type="button" onClick={() => saveEdit(index)} className="text-brand-teal hover:text-[#008f7a]">
                                    <Save size={14} />
                                </button>
                                <button type="button" onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
                                    <XCircle size={14} />
                                </button>
                            </div>
                        ) : (
                            <>
                                <span className="text-gray-700 flex-1 truncate mr-2 select-none" title={item}>{item}</span>
                                <div className="flex space-x-1 items-center">
                                    <button 
                                        type="button"
                                        onClick={() => startEdit(index, item)}
                                        className="text-gray-400 hover:text-brand-teal p-1.5 rounded hover:bg-teal-50 transition-colors"
                                        title="Rename"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(index);
                                        }}
                                        className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export const AdminDashboard = () => {
  const { requests, users, addUser, editUser, deleteUser, updateLogo, logoUrl, systemLists, updateSystemList, showDemoCredentials, toggleDemoCredentials, copyrightText, updateCopyrightText, updateNotificationSound, resetSystemData } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'settings'>('overview');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newRoles, setNewRoles] = useState<string[]>([]);
  const [newPassword, setNewPassword] = useState('');

  const [tempLogo, setTempLogo] = useState<string | null>(null);
  const [tempSound, setTempSound] = useState<string | null>(null);
  const [soundFileName, setSoundFileName] = useState('');

  const [localCopyright, setLocalCopyright] = useState(copyrightText);
  const [localShowDemo, setLocalShowDemo] = useState(showDemoCredentials);
  
  useEffect(() => {
      setLocalCopyright(copyrightText);
  }, [copyrightText]);

  useEffect(() => {
      setLocalShowDemo(showDemoCredentials);
  }, [showDemoCredentials]);

  const handleSaveCopyright = () => {
      updateCopyrightText(localCopyright);
      alert("Copyright note saved successfully!");
  };

  const handleSaveDemoSettings = () => {
      toggleDemoCredentials(localShowDemo);
      alert("Demo credentials setting saved successfully!");
  }

  const handleResetData = async () => {
      const confirmed = window.confirm("Are you strictly sure you want to DELETE ALL REQUEST DATA? This cannot be undone.");
      if (confirmed) {
          const doubleCheck = window.prompt("Type 'DELETE' to confirm data reset:");
          if (doubleCheck === 'DELETE') {
              await resetSystemData();
          }
      }
  };

  // Calculate Totals
  const totalRequests = requests.length;
  const totalAmount = requests.reduce((acc, r) => acc + r.amount, 0);
  
  // Explicit calculation for PENDING requests (awaiting organization action)
  const pendingCount = requests.filter(r => 
      r.status === RequestStatus.PENDING_SUPERVISOR || 
      r.status === RequestStatus.PENDING_AUTHORIZATION || 
      r.status === RequestStatus.AUTHORIZED || 
      r.status === RequestStatus.FROZEN
  ).length;
  
  const approvedCount = requests.filter(r => r.status === RequestStatus.APPROVED).length;

  const deptDataMap: Record<string, number> = {};
  requests.forEach(r => {
    deptDataMap[r.department] = (deptDataMap[r.department] || 0) + 1;
  });
  const deptData = Object.keys(deptDataMap).map(key => ({ name: key, value: deptDataMap[key] }));

  const statusDataMap: Record<string, number> = {};
  requests.forEach(r => {
    let key = r.status.toString();
    if(key.includes('Rejected')) key = 'Rejected';
    statusDataMap[key] = (statusDataMap[key] || 0) + 1;
  });
  const statusData = Object.keys(statusDataMap).map(key => ({ name: key, count: statusDataMap[key] }));

  const COLORS = ['#00a88f', '#006680', '#fa4515', '#ffc658', '#82ca9d'];

  const openAddUserModal = () => {
    setEditingUserId(null);
    setNewName('');
    setNewEmail('');
    setNewPhoneNumber('');
    setNewDepartment('');
    setNewPosition('');
    setNewRoles([Role.STAFF]); 
    setNewPassword('');
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (user: User) => {
    setEditingUserId(user.id);
    setNewName(user.name);
    setNewEmail(user.email);
    setNewPhoneNumber(user.phoneNumber || '');
    setNewDepartment(user.department);
    setNewPosition(user.position || '');
    setNewRoles(user.roles);
    setNewPassword(user.password || '');
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = (user: User) => {
      if (window.confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
          deleteUser(user.id);
      }
  };

  const toggleRole = (role: string) => {
    setNewRoles(prev => {
        if (prev.includes(role)) {
            return prev.filter(r => r !== role);
        } else {
            return [...prev, role];
        }
    });
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoles.length === 0) {
        alert("Please select at least one role.");
        return;
    }
    const userData = {
        name: newName,
        email: newEmail,
        phoneNumber: newPhoneNumber,
        department: newDepartment,
        position: newPosition,
        roles: newRoles,
        password: newPassword
    };
    if (editingUserId) {
      editUser(editingUserId, userData);
    } else {
      addUser(userData);
    }
    setIsUserModalOpen(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                setTempLogo(reader.result);
            }
        };
        reader.readAsDataURL(file);
    }
  };

  const saveNewLogo = () => {
    if (tempLogo) {
        updateLogo(tempLogo);
        setTempLogo(null);
        alert("Logo saved successfully!");
    }
  };

  const cancelLogoUpdate = () => {
      setTempLogo(null);
  };

  const handleSoundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (!file.name.toLowerCase().endsWith('.wav')) {
              alert('Only .wav files are supported for notification sounds.');
              return;
          }
          setSoundFileName(file.name);
          const reader = new FileReader();
          reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                  setTempSound(reader.result);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const saveNewSound = () => {
      if (tempSound) {
          updateNotificationSound(tempSound);
          setTempSound(null);
          setSoundFileName('');
          alert("Notification sound updated successfully!");
      }
  };

  const playPreviewSound = (soundSrc: string) => {
      const audio = new Audio(soundSrc);
      audio.play();
  };

  return (
    <div className="space-y-6 text-gray-900">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-900">Admin Portal</h2>
           <p className="text-gray-500 text-sm">System administration and analytics</p>
        </div>
        <div className="flex bg-gray-200 p-1 rounded-lg self-start overflow-x-auto max-w-full">
            <button 
                onClick={() => setActiveTab('overview')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-white text-brand-teal shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
                <LayoutDashboard size={16} />
                <span>Overview</span>
            </button>
            <button 
                onClick={() => setActiveTab('users')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-white text-brand-teal shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
                <Users size={16} />
                <span>User Management</span>
            </button>
            <button 
                onClick={() => setActiveTab('settings')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-white text-brand-teal shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
                <Settings size={16} />
                <span>Settings</span>
            </button>
        </div>
      </div>

      {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Volume</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">GHS {totalAmount.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Requests</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{totalRequests}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Approved</h3>
                    <p className="text-3xl font-bold text-brand-teal mt-2">{approvedCount}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Pending</h3>
                    <p className="text-3xl font-bold text-yellow-600 mt-2">{pendingCount}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow min-h-[400px]">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Requests by Department</h3>
                    <div className="w-full h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={deptData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {deptData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow min-h-[400px]">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Request Status Distribution</h3>
                    <div className="w-full h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={statusData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" tick={{fontSize: 12}} />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="count" fill="#006680" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            
            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-bold text-gray-800">Recent System Activity</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requester</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {requests.slice(0, 10).map((req) => (
                                <tr key={req.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{req.requesterName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{req.vendorName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{req.currency} {req.amount.toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium 
                                            ${req.status === RequestStatus.APPROVED ? 'bg-brand-teal/10 text-brand-teal' : 
                                            req.status === RequestStatus.AUTHORIZED ? 'bg-purple-100 text-purple-800' :
                                            req.status.includes('Rejected') ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {req.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
      )}

      {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                 <h3 className="text-lg font-bold text-gray-800">User Directory</h3>
                 <button 
                    onClick={openAddUserModal}
                    className="flex items-center space-x-2 bg-brand-teal hover:bg-[#008f7a] text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
                 >
                     <UserPlus size={18} />
                     <span>Add New User</span>
                 </button>
             </div>

             <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roles</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-full bg-brand-teal/10 flex items-center justify-center text-brand-teal font-bold mr-3 overflow-hidden">
                                                {u.profilePictureUrl ? (
                                                    <img src={u.profilePictureUrl} alt={u.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    u.name.charAt(0)
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{u.name}</div>
                                                <div className="text-xs text-gray-500">{u.position || 'N/A'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-wrap gap-1">
                                            {u.roles.map(r => (
                                                <span key={r} className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                    ${r === Role.ADMIN ? 'bg-purple-100 text-purple-800' : 
                                                    r === Role.APPROVER ? 'bg-indigo-100 text-indigo-800' :
                                                    r === Role.AUTHORIZER ? 'bg-brand-dark/10 text-brand-dark' : 
                                                    r === Role.AUDITOR ? 'bg-green-100 text-green-800' :
                                                    'bg-gray-100 text-gray-800'}`}>
                                                    {r.replace('_', ' ')}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.department}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div>{u.email}</div>
                                        {u.phoneNumber && <div className="text-xs text-gray-400">{u.phoneNumber}</div>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-3">
                                            <button 
                                                onClick={() => openEditUserModal(u)}
                                                className="text-brand-dark hover:text-brand-teal flex items-center"
                                            >
                                                <Edit2 size={16} className="mr-1" /> Edit
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteUser(u)}
                                                className="text-red-400 hover:text-red-600 flex items-center"
                                            >
                                                <Trash2 size={16} className="mr-1" /> Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
          </div>
      )}

      {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <ImageIcon size={20} className="text-brand-teal" />
                        Branding Settings
                    </h3>
                    <div className="border rounded-lg p-6 bg-gray-50 flex flex-col items-center justify-center gap-6">
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-700 mb-2">
                                {tempLogo ? "Preview New Logo" : "Current Organization Logo"}
                            </p>
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 inline-block mb-4">
                                <img src={tempLogo || logoUrl} alt="Organization Logo" className="h-24 w-auto object-contain" />
                            </div>
                            {tempLogo && (
                                <div className="flex flex-col gap-2 justify-center">
                                    <button onClick={saveNewLogo} className="flex items-center justify-center space-x-2 bg-brand-teal text-white px-4 py-2 rounded shadow hover:bg-[#008f7a] transition-colors"><Save size={16} /><span>Save New Logo</span></button>
                                    <button onClick={cancelLogoUpdate} className="text-sm text-gray-500 hover:text-gray-800 underline">Cancel</button>
                                </div>
                            )}
                        </div>
                        {!tempLogo && (
                            <div className="w-full max-w-md">
                                <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Upload New Logo (PNG, JPG, SVG)</label>
                                <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-100 transition-colors">
                                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                    <Upload className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-500">Click or drag file to upload</p>
                                </div>
                            </div>
                        )}
                    </div>
               </div>

               <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Music size={20} className="text-brand-teal" />
                        Notification Sound
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600 mb-4">Change the sound that plays when new notifications or messages arrive.</p>
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Upload New Sound (.wav)</label>
                                <div className="flex gap-2">
                                    <input type="file" accept=".wav" onChange={handleSoundUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-teal file:text-white file:hover:bg-[#008f7a]" />
                                </div>
                                {soundFileName && <p className="text-xs text-brand-teal mt-1">Selected: {soundFileName}</p>}
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button onClick={() => playPreviewSound(tempSound || systemLists.notificationSound || '')} className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">{tempSound ? "Preview New" : "Play Current"}</button>
                                {tempSound && (<button onClick={saveNewSound} className="flex items-center space-x-2 bg-brand-teal text-white px-4 py-2 rounded-md text-sm shadow hover:bg-[#008f7a] transition-colors"><Save size={16} /><span>Save Sound</span></button>)}
                            </div>
                        </div>
                    </div>
               </div>
               
               <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Type size={20} className="text-brand-teal" />
                        Footer Settings
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Copyright Note</label>
                        <p className="text-xs text-gray-500 mb-3">Customize the text that appears at the bottom of the login page and dashboard. You can use simple HTML tags like &lt;span&gt; or &lt;strong&gt;.</p>
                        <textarea value={localCopyright} onChange={(e) => setLocalCopyright(e.target.value)} rows={3} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal bg-white" placeholder="Enter copyright text..." />
                        <div className="flex justify-between items-start mt-3">
                            <div className="text-xs text-gray-400"><span className="font-semibold mr-2">Preview:</span><span dangerouslySetInnerHTML={{ __html: localCopyright }}></span></div>
                            <button onClick={handleSaveCopyright} className="flex items-center space-x-2 bg-brand-teal text-white px-3 py-1.5 rounded text-sm shadow hover:bg-[#008f7a] transition-colors"><Save size={14} /><span>Save</span></button>
                        </div>
                    </div>
               </div>

               <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Settings size={20} className="text-brand-teal" />
                        Login Configuration
                    </h3>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                            <div><h4 className="font-bold text-gray-800">Demo Credentials</h4><p className="text-sm text-gray-500">Show a list of test accounts and passwords on the login screen for demonstration purposes.</p></div>
                            <button onClick={() => setLocalShowDemo(!localShowDemo)} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${localShowDemo ? 'bg-brand-teal' : 'bg-gray-200'}`}><span className="sr-only">Use setting</span><span aria-hidden="true" className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${localShowDemo ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                        </div>
                        <div className="flex justify-end"><button onClick={handleSaveDemoSettings} disabled={localShowDemo === showDemoCredentials} className={`flex items-center space-x-2 px-3 py-1.5 rounded text-sm shadow transition-colors ${localShowDemo === showDemoCredentials ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-brand-teal text-white hover:bg-[#008f7a]'}`}><Save size={14} /><span>Save Changes</span></button></div>
                    </div>
               </div>

               <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Trash2 size={20} className="text-red-500" />
                        Data Management
                    </h3>
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <h4 className="text-red-800 font-bold mb-2">Danger Zone</h4>
                        <p className="text-sm text-red-600 mb-4">Resetting the system will permanently delete all payment requests and their associated history. User accounts and system configurations will be preserved. <strong>This action cannot be undone.</strong></p>
                        <button onClick={handleResetData} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow transition-colors text-sm font-medium flex items-center gap-2"><Trash2 size={16} />Reset All Request Data</button>
                    </div>
               </div>

               <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Shield size={20} className="text-brand-teal" />
                        System Dropdown Lists
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">Manage the options available in dropdown menus across the application.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <ListManager title="Departments" items={systemLists.departments} onUpdate={(newList) => updateSystemList('departments', newList)} />
                        <ListManager title="Positions" items={systemLists.positions} onUpdate={(newList) => updateSystemList('positions', newList)} />
                        <ListManager title="User Roles" items={systemLists.roles} onUpdate={(newList) => updateSystemList('roles', newList)} />
                        <ListManager title="Currencies" items={systemLists.currencies} onUpdate={(newList) => updateSystemList('currencies', newList)} />
                        <ListManager title="Billing Projects" items={systemLists.billingProjects} onUpdate={(newList) => updateSystemList('billingProjects', newList)} />
                        <ListManager title="Payment Methods" items={systemLists.paymentMethods} onUpdate={(newList) => updateSystemList('paymentMethods', newList)} />
                        <ListManager title="Momo Operators" items={systemLists.momoOperators} onUpdate={(newList) => updateSystemList('momoOperators', newList)} />
                    </div>
               </div>

               <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Shield size={20} className="text-brand-teal" />
                        Finance Notification Recipients
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Email addresses cc'd on every final-approval notification (alongside the requester and supervisor).
                        Use a shared inbox such as finance@yotaweb.org so it survives staff changes.
                        If left empty, the current Finance Manager is used.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ListManager title="Finance Emails" items={systemLists.financeNotifyEmails || []} onUpdate={(newList) => updateSystemList('financeNotifyEmails', newList)} />
                    </div>
               </div>
          </div>
      )}

      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-0 md:p-4 backdrop-blur-sm">
            <div className="bg-white md:rounded-xl shadow-2xl w-full max-w-lg h-full md:h-auto overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b">
                    <h3 className="text-xl font-bold text-gray-900">{editingUserId ? 'Edit User' : 'Add New User'}</h3>
                    <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                <form onSubmit={handleUserSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Users size={16} className="text-gray-400" /></div>
                            <input required type="text" className="pl-10 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal bg-white" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. John Doe" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail size={16} className="text-gray-400" /></div>
                                <input required type="email" className="pl-10 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal text-sm bg-white" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="user@org.com" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Phone size={16} className="text-gray-400" /></div>
                                <input type="tel" className="pl-10 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal text-sm bg-white" value={newPhoneNumber} onChange={e => setNewPhoneNumber(e.target.value)} placeholder="+233..." />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Briefcase size={16} className="text-gray-400" /></div>
                                <select required className="pl-10 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal bg-white text-sm" value={newDepartment} onChange={e => setNewDepartment(e.target.value)} >
                                    <option value="">Select Dept</option>
                                    {systemLists.departments.map(dept => (<option key={dept} value={dept}>{dept}</option>))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                            <select required className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal bg-white text-sm" value={newPosition} onChange={e => setNewPosition(e.target.value)} >
                                <option value="">Select Position</option>
                                {systemLists.positions.map(pos => (<option key={pos} value={pos}>{pos}</option>))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Assign Roles</label>
                        <div className="bg-gray-50 p-4 rounded-md border border-gray-200 space-y-2 h-40 overflow-y-auto custom-scrollbar">
                             {systemLists.roles.map((role) => (
                                 <label key={role} className="flex items-center space-x-3 cursor-pointer">
                                     <input type="checkbox" className="h-4 w-4 text-brand-teal focus:ring-brand-teal border-gray-300 rounded" checked={newRoles.includes(role)} onChange={() => toggleRole(role)} />
                                     <div className="flex flex-col"><span className="text-sm font-medium text-gray-900 capitalize">{role.replace('_', ' ')}</span></div>
                                 </label>
                             ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{editingUserId ? "Reset Password (Optional)" : "Temporary Password"}</label>
                         <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Key size={16} className="text-gray-400" /></div>
                            <input required={!editingUserId} type="text" className="pl-10 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal font-mono bg-white" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={editingUserId ? "Leave empty to keep current" : "Enter temp password"} />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4 border-t mt-2">
                        <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-teal rounded-md hover:bg-[#008f7a] shadow-sm">{editingUserId ? 'Update User' : 'Create User'}</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};