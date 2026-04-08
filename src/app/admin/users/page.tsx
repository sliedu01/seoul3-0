"use client";
import { useState, useEffect } from "react";
import { Users, UserCheck, UserX, Shield, Mail, Phone, Building, Search, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (err) {
      console.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (userId: string, updates: any) => {
    setActionLoading(userId);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...updates }),
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, ...updates } : u));
      }
    } catch (err) {
      console.error("Failed to update user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("정말로 이 사용자를 삭제하시겠습니까?")) return;
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/users?userId=${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
      }
    } catch (err) {
      console.error("Failed to delete user");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-3 md:p-6 lg:p-8 max-w-full mx-auto min-h-screen bg-slate-50/30">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            사용자 관리
          </h1>
          <p className="text-slate-500 font-medium mt-1">회원 가입 승인 및 권한 등급을 관리합니다.</p>
        </div>

        <div className="relative group min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="이름, 이메일, 회사명 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm font-medium text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-bold">사용자 정보를 불러오는 중...</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">사용자 정보</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">연락처 / 소속</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">상태 / 등급</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">관리 작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">검색 결과가 없습니다.</td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 font-bold">
                            {user.name?.[0] || user.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{user.name || "미지정"}</p>
                            <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                            <Phone className="h-3 w-3" /> {user.phone || "-"}
                          </div>
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                            <Building className="h-3 w-3" /> {user.company || "-"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleUpdate(user.id, { isApproved: !user.isApproved })}
                            disabled={actionLoading === user.id}
                            className={cn(
                              "text-[11px] px-2.5 py-1 rounded-lg font-black transition-all flex items-center gap-1",
                              user.isApproved 
                                ? "bg-green-100 text-green-700 hover:bg-green-200" 
                                : "bg-amber-100 text-amber-700 hover:bg-amber-200 shadow-sm shadow-amber-100 animate-pulse"
                            )}
                          >
                            {user.isApproved ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                            {user.isApproved ? "승인됨" : "승인 대기"}
                          </button>
                          
                          <select
                            value={user.role}
                            onChange={(e) => handleUpdate(user.id, { role: e.target.value })}
                            disabled={actionLoading === user.id}
                            className={cn(
                              "text-[11px] px-2 py-1 rounded-lg font-black outline-none border-none cursor-pointer transition-all",
                              user.role === 'ADMIN' ? "bg-red-100 text-red-600" : 
                              user.role === 'OPERATOR' ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-600"
                            )}
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="OPERATOR">OPERATOR</option>
                            <option value="MEMBER">MEMBER</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={actionLoading === user.id}
                          className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
