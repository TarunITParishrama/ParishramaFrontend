import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Hostel() {
  const navigate = useNavigate();
  const userRole = localStorage.getItem("userRole");

  // Tabs Based on Role
  const getTabs = (role) => {
    if (role === "super_admin" || role === "admin") {
      return [
        { id: "food", label: "Food" },
        { id: "rooms", label: "Rooms" },
      ];
    }
    return [{ id: "food", label: "Food" }]; // parent
  };

  const tabs = getTabs(userRole);
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  // Form States
  const [campuses, setCampuses] = useState([]);
  const [formData, setFormData] = useState({
    campusId: "",
    day: "",
    session: "",
    dishes: [""],
    timeSlot: "",
  });

  // Weekly Chart Data
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const defaultTimeSlots = {
    Breakfast: "7:00 AM - 8:00 AM",
    Lunch: "1:00 PM - 2:00 PM",
    Snacks: "5:30 PM - 6:00 PM",
    Dinner: "8:00 PM - 9:00 PM",
  };

  const sessions = ["Breakfast", "Lunch", "Snacks", "Dinner"];
  const [menuData, setMenuData] = useState([]);
  const [editingFood, setEditingFood] = useState(null);
  const [selectedCampuses, setSelectedCampuses] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupChoices, setPopupChoices] = useState([]);

  const [parentStudent, setParentStudent] = useState(null);
  const [parentMenu, setParentMenu] = useState([]);
  const [parentLoading, setParentLoading] = useState(false);
  const [parentError, setParentError] = useState("");
  const todayName = days[new Date().getDay()];

  // Fetch Campuses
  useEffect(() => {
    const token = localStorage.getItem("token");
    axios
      .get(`${process.env.REACT_APP_URL}/api/getcampuses`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => setCampuses(res.data.data))
      .catch((err) => console.log(err));
  }, []);

  // Fetch Menu
  useEffect(() => {
    const token = localStorage.getItem("token");
    axios
      .get(`${process.env.REACT_APP_URL}/api/getallfood`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => setMenuData(res.data.data))
      .catch((err) => console.log(err));
  }, []);

  useEffect(() => {
    if (userRole !== "parent") return;

    const fetchParentMenu = async () => {
      try {
        setParentLoading(true);
        setParentError("");

        const token = localStorage.getItem("token");
        const regNumber = localStorage.getItem("regNumber");
        if (!regNumber) {
          throw new Error("Student registration number not found");
        }

        // 1. get student (with campus)
        const studentResp = await axios.get(
          `${process.env.REACT_APP_URL}/api/getstudentbyreg/${regNumber}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const studentData = studentResp.data.data;
        setParentStudent(studentData);

        const campusId = studentData?.campus?._id;
        if (!campusId) {
          throw new Error("Campus not found for this student");
        }

        // 2. get today's menu for that campus
        const menuResp = await axios.get(
          `${process.env.REACT_APP_URL}/api/getfoodforcampus/${campusId}?day=${todayName}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setParentMenu(menuResp.data.data ?? []);
      } catch (err) {
        console.error(err);
        setParentError(
          err.response?.data?.message ||
            err.message ||
            "Failed to load today's menu"
        );
        setParentMenu([]);
      } finally {
        setParentLoading(false);
      }
    };

    fetchParentMenu();
  }, [userRole, todayName]);

  // Handle Input Change
  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Add Dish
  const addDish = () => {
    setFormData({ ...formData, dishes: [...formData.dishes, ""] });
  };

  // Change Dish Value
  const updateDish = (index, value) => {
    const updated = [...formData.dishes];
    updated[index] = value;
    setFormData({ ...formData, dishes: updated });
  };

  // Submit Form
  const handleSubmit = async () => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    // campuses to use: from multi-select or single campusId
    const campusesToUse =
      selectedCampuses.length > 0
        ? selectedCampuses
        : formData.campusId
        ? [formData.campusId]
        : [];

    if (!campusesToUse.length) {
      alert("Please select at least one campus");
      return;
    }

    try {
      // check if this should be an UPDATE
      const canUpdate =
        editingFood &&
        campusesToUse.length === 1 &&
        campusesToUse[0] ===
          (editingFood.campusId || editingFood.campusId?._id) &&
        formData.day === editingFood.day &&
        formData.session === editingFood.session;

      if (canUpdate) {
        // UPDATE existing record
        await axios.put(
          `${process.env.REACT_APP_URL}/api/updatefood/${editingFood._id}`,
          { ...formData, campusId: campusesToUse[0] },
          { headers }
        );
        alert("Menu Updated Successfully");
      } else {
        // CREATE one record per campus (bulk create)
        const basePayload = {
          ...formData,
          day: formData.day,
          session: formData.session,
          dishes: formData.dishes,
          timeSlot: formData.timeSlot,
        };
        delete basePayload._id;

        for (const cId of campusesToUse) {
          await axios.post(
            `${process.env.REACT_APP_URL}/api/createfood`,
            { ...basePayload, campusId: cId },
            { headers }
          );
        }
        alert("Menu Saved Successfully");
      }

      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Error Saving Menu");
    }
  };

  // Load cell data for editing
  const handleCellClick = (day, session) => {
    const entries = menuData.filter(
      (x) => x.day === day && x.session === session
    );

    if (entries.length === 0) {
      // create mode
      setEditingFood(null);
      setSelectedCampuses([]); // nothing selected yet
      setFormData({
        campusId: "",
        day,
        session,
        dishes: [""],
        timeSlot: defaultTimeSlots[session] || "",
      });
      return;
    }

    if (entries.length === 1) {
      const e = entries[0];
      setEditingFood({
        _id: e._id,
        campusId: e.campusId._id || e.campusId, // works with populate or raw
        day: e.day,
        session: e.session,
      });
      setSelectedCampuses([e.campusId._id || e.campusId]);
      setFormData({
        ...e,
        campusId: e.campusId._id || e.campusId,
        dishes: e.dishes?.length ? e.dishes : [""],
      });
      return;
    }

    // multiple → popup
    setPopupChoices(entries);
    setShowPopup(true);
  };

  const handleChooseEntry = (entry) => {
    setEditingFood({
      _id: entry._id,
      campusId: entry.campusId._id || entry.campusId,
      day: entry.day,
      session: entry.session,
    });
    setSelectedCampuses([entry.campusId._id || entry.campusId]);
    setFormData({
      ...entry,
      campusId: entry.campusId._id || entry.campusId,
      dishes: entry.dishes?.length ? entry.dishes : [""],
    });
    setShowPopup(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8">
        <button
          onClick={() => navigate("/home")}
          className="text-white text-sm mb-2"
        >
          ◀ Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold">Hostel</h1>

        {/* Tabs */}
        <div className="mt-4 flex space-x-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`pb-1 capitalize ${
                activeTab === t.id
                  ? "border-b-2 border-white"
                  : "text-gray-200 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto mt-6 p-4">
        {/* FOOD TAB */}
        {activeTab === "food" &&
          (userRole === "parent" ? (
            <div className="bg-white shadow-md rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-2">
                Today&apos;s Menu –{" "}
                {parentStudent?.campus?.name || "Your Campus"}
              </h2>
              <p className="text-sm text-gray-500 mb-4">{todayName}</p>

              {parentLoading ? (
                <p>Loading today&apos;s menu...</p>
              ) : parentError ? (
                <p className="text-red-500 text-sm">{parentError}</p>
              ) : parentMenu.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No menu has been updated for today.
                </p>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session) => {
                    const items = parentMenu.filter(
                      (x) => x.session === session
                    );
                    return (
                      <div key={session} className="border-b pb-3">
                        <h3 className="font-semibold text-gray-800 mb-1">
                          {session}
                        </h3>
                        {items.length === 0 ? (
                          <p className="text-gray-400 text-sm">
                            No menu updated for this session.
                          </p>
                        ) : (
                          <ul className="list-disc pl-5 text-sm text-gray-700">
                            {items.map((item) =>
                              item.dishes.map((dish, idx) => (
                                <li key={item._id + "_" + idx}>{dish}</li>
                              ))
                            )}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold mb-3">Weekly Food Chart</h2>

              {/* Chart Table */}
              <div className="overflow-x-auto bg-white rounded-lg shadow-lg p-4">
                <table className="w-full border">
                  <thead>
                    <tr>
                      <th className="border p-2">Day / Session</th>
                      {sessions.map((s) => (
                        <th key={s} className="border p-2">
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {days.map((day) => (
                      <tr key={day}>
                        <td className="border font-medium text-center p-2">
                          {day}
                        </td>

                        {sessions.map((session) => {
                          const entries = menuData.filter(
                            (x) => x.day === day && x.session === session
                          );

                          let cellContent;

                          if (entries.length === 0) {
                            cellContent = (
                              <span className="text-gray-400 text-sm">
                                No Data
                              </span>
                            );
                          } else if (entries.length === 1) {
                            const e = entries[0];
                            const campusName = e.campusId?.name || "Unknown";
                            const firstDish = e.dishes?.[0] || "(No dishes)";
                            cellContent = (
                              <span className="text-sm">
                                {firstDish} ({campusName})
                              </span>
                            );
                          } else {
                            const e = entries[0];
                            const campusName = e.campusId?.name || "Unknown";
                            const firstDish = e.dishes?.[0] || "(No dishes)";
                            cellContent = (
                              <span className="text-sm font-medium">
                                {firstDish} ({campusName}) +{" "}
                                {entries.length - 1}
                              </span>
                            );
                          }

                          return (
                            <td
                              key={session}
                              className="border p-2 cursor-pointer hover:bg-yellow-100"
                              onClick={() => handleCellClick(day, session)}
                            >
                              {cellContent}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {showPopup && (
                  <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
                    <div className="bg-white p-4 rounded-lg shadow-lg w-80">
                      <h3 className="font-semibold mb-3">
                        Select Menu to Edit
                      </h3>

                      {popupChoices.map((item) => (
                        <div
                          key={item._id}
                          className="p-2 border rounded mb-2 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleChooseEntry(item)}
                        >
                          <div className="font-medium">
                            {item.dishes.join(", ")}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.campusId?.name || "Unknown"}
                          </div>
                        </div>
                      ))}

                      <button
                        className="mt-2 text-red-600 text-sm"
                        onClick={() => setShowPopup(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* FORM (Only admin/super_admin) */}
              {(userRole === "admin" || userRole === "super_admin") && (
                <div className="bg-white shadow-md mt-6 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">
                    Add / Update Menu
                  </h3>

                  {/* Campus */}
                  <label className="block mb-2 font-medium">Campus</label>
                  <select
                    className="w-full border p-2 rounded mb-1"
                    multiple={!editingFood} // multi-select only when creating
                    value={
                      selectedCampuses.length
                        ? selectedCampuses
                        : formData.campusId
                        ? [formData.campusId]
                        : []
                    }
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions).map(
                        (o) => o.value
                      );
                      setSelectedCampuses(values);

                      // in edit mode we always keep exactly one campusId
                      if (editingFood && values.length === 1) {
                        handleFormChange("campusId", values[0]);
                      } else if (!editingFood && values.length === 1) {
                        handleFormChange("campusId", values[0]);
                      } else {
                        handleFormChange("campusId", "");
                      }
                    }}
                  >
                    {campuses.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  {!editingFood && (
                    <p className="text-xs text-gray-500 mt-1">
                      Tip: Hold Ctrl (Cmd on Mac) to select multiple campuses.
                    </p>
                  )}
                  {editingFood && (
                    <p className="text-xs text-gray-500 mt-1">
                      Editing existing menu – campus is single-select.
                    </p>
                  )}

                  {/* Day */}
                  <label className="block mb-2 font-medium">Day</label>
                  <select
                    className="w-full border p-2 rounded mb-4"
                    onChange={(e) => handleFormChange("day", e.target.value)}
                  >
                    <option value="">Select Day</option>
                    {days.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>

                  {/* Session */}
                  <label className="block mb-2 font-medium">Session</label>
                  <select
                    className="w-full border p-2 rounded mb-4"
                    value={formData.session}
                    onChange={(e) => {
                      const session = e.target.value;
                      const timeSlot = defaultTimeSlots[session] || "";

                      setFormData((prev) => ({
                        ...prev,
                        session,
                        timeSlot,
                      }));
                    }}
                  >
                    <option value="">Select Session</option>
                    {sessions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  {/* Dishes */}
                  <label className="block mb-2 font-medium">Dishes</label>
                  {formData.dishes.map((dish, i) => (
                    <input
                      key={i}
                      className="w-full border p-2 rounded mb-2"
                      value={dish}
                      onChange={(e) => updateDish(i, e.target.value)}
                    />
                  ))}
                  <button
                    onClick={addDish}
                    className="text-blue-600 text-sm mb-4"
                  >
                    + Add More
                  </button>

                  {/* Time Slot */}
                  <label className="block mb-2 font-medium">Time Slot</label>
                  <input
                    className="w-full border p-2 rounded mb-4"
                    value={formData.timeSlot}
                    onChange={(e) =>
                      handleFormChange("timeSlot", e.target.value)
                    }
                    placeholder="e.g., 8:00 AM - 9:00 AM"
                  />

                  <button
                    onClick={handleSubmit}
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                  >
                    Submit
                  </button>
                </div>
              )}
            </div>
          ))}

        {/* ROOMS TAB */}
        {activeTab === "rooms" && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-lg font-semibold">Rooms (Coming Soon)</h2>
          </div>
        )}
      </div>
    </div>
  );
}
