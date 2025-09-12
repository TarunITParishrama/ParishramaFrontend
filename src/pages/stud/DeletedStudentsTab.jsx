import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function DeletedStudentsTab() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const apiBase = useMemo(() => (process.env.REACT_APP_URL || '').replace(/\/+$/,''), []);

  const fetchPage = async (p = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${apiBase}/api/deleted-students?page=${p}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRows(res.data.data || []);
      setPage(res.data.page || 1);
      setTotalPages(res.data.totalPages || 1);
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to load deleted students';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${apiBase}/api/deleted-students/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelected(res.data.data);
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to load details';
      toast.error(msg);
    }
  };

  useEffect(() => { fetchPage(1); }, []); // initial

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Deleted Students</h2>
        <button onClick={()=>fetchPage(page)} className="px-3 py-1 bg-gray-100 rounded">Refresh</button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">RegNumber</th>
              <th className="p-2 text-left">Image</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Campus</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4" colSpan={4}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="p-4" colSpan={4}>No deleted students</td></tr>
            ) : (
              rows.map(r => (
                <tr key={r._id} className="border-t hover:bg-gray-50">
                  <td className="p-2 font-mono">{r.regNumber}</td>
                  <td className="p-2">
                    {r.studentImageURL ? (
                      <img src={r.studentImageURL} alt="img" className="w-10 h-10 object-cover rounded"/>
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">N/A</div>
                    )}
                  </td>
                  <td className="p-2">
                    <button className="text-blue-600 hover:underline" onClick={()=>openDetail(r._id)}>
                      {r.studentName}
                    </button>
                  </td>
                  <td className="p-2">{r.campus?.name || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2 mt-3">
        <button disabled={page<=1} onClick={()=>fetchPage(page-1)} className="px-3 py-1 bg-white border rounded disabled:opacity-50">Prev</button>
        <span className="text-sm">Page {page} of {totalPages}</span>
        <button disabled={page>=totalPages} onClick={()=>fetchPage(page+1)} className="px-3 py-1 bg-white border rounded disabled:opacity-50">Next</button>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Archived Student Details</h3>
              <button onClick={()=>setSelected(null)} className="px-2 py-1">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="font-medium">Name:</span> {selected.studentName}</div>
              <div><span className="font-medium">RegNumber:</span> {selected.regNumber}</div>
              <div><span className="font-medium">Campus:</span> {selected.campus?.name}</div>
              <div><span className="font-medium">Section:</span> {selected.section}</div>
              <div><span className="font-medium">Admission Year:</span> {selected.admissionYear}</div>
              <div><span className="font-medium">Gender:</span> {selected.gender}</div>
              <div><span className="font-medium">Admission Type:</span> {selected.admissionType}</div>
              <div><span className="font-medium">Allotment:</span> {selected.allotmentType}</div>
              <div><span className="font-medium">Father:</span> {selected.fatherName}</div>
              <div><span className="font-medium">Father Mobile:</span> {selected.fatherMobile}</div>
              <div><span className="font-medium">Contact:</span> {selected.contact}</div>
              <div><span className="font-medium">Email:</span> {selected.emailId || '—'}</div>
              <div className="col-span-2"><span className="font-medium">Address:</span> {selected.address}</div>
              <div className="col-span-2"><span className="font-medium">Reason:</span> {selected.reason}</div>
              <div className="col-span-2"><span className="font-medium">Deleted At:</span> {new Date(selected.deletedAt).toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
