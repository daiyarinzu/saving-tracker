import { useState, useEffect } from "react";
import "./App.css";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

function App() {
  const [members, setMembers] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [selectedMember, setSelectedMember] = useState("");
  const [amount, setAmount] = useState("");
  const [contributionDate, setContributionDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [editingMember, setEditingMember] = useState(null);
  const [editMemberName, setEditMemberName] = useState("");
  const [editingContribution, setEditingContribution] = useState(null);
  const [editContribAmount, setEditContribAmount] = useState("");
  const [editContribImage, setEditContribImage] = useState(null);
  const [filterName, setFilterName] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const CLOUDINARY_CLOUD_NAME = "drvx9vxpc";
  const CLOUDINARY_UPLOAD_PRESET = "savings_tracker";
  const MONTHLY_EXPECTED_AMOUNT = 500;

  useEffect(() => {
    const q = query(collection(db, "members"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const membersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMembers(membersData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "contributions"),
      orderBy("timestamp", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const contributionsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setContributions(contributionsData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const now = new Date();
    setSelectedMonth(String(now.getMonth() + 1));
    setSelectedYear(String(now.getFullYear()));
    setContributionDate(now.toISOString().split("T")[0]);
  }, []);

  const totalSavings = contributions.reduce(
    (sum, contrib) => sum + contrib.amount,
    0
  );

  const getMemberTotal = (memberName) => {
    return contributions
      .filter((contrib) => contrib.memberName === memberName)
      .reduce((sum, contrib) => sum + contrib.amount, 0);
  };

  const getMonthlyContributions = (month, year) => {
    return contributions.filter((contrib) => {
      const contribDate = contrib.timestamp?.toDate
        ? contrib.timestamp.toDate()
        : new Date(contrib.timestamp);
      return (
        contribDate.getMonth() + 1 === parseInt(month) &&
        contribDate.getFullYear() === parseInt(year)
      );
    });
  };

  const getMemberMonthlyTotal = (memberName, month, year) => {
    const monthlyContribs = getMonthlyContributions(month, year);
    return monthlyContribs
      .filter((contrib) => contrib.memberName === memberName)
      .reduce((sum, contrib) => sum + contrib.amount, 0);
  };

  const generateMonthlyReport = () => {
    if (!selectedMonth || !selectedYear) return null;

    const monthlyContribs = getMonthlyContributions(
      selectedMonth,
      selectedYear
    );
    const totalCollected = monthlyContribs.reduce(
      (sum, contrib) => sum + contrib.amount,
      0
    );

    const memberReports = members.map((member) => {
      const paidAmount = getMemberMonthlyTotal(
        member.name,
        selectedMonth,
        selectedYear
      );
      const status =
        paidAmount >= MONTHLY_EXPECTED_AMOUNT
          ? "Paid Full"
          : paidAmount > 0
          ? "Partial"
          : "Not Paid";
      const balance = MONTHLY_EXPECTED_AMOUNT - paidAmount;

      return {
        name: member.name,
        paidAmount,
        status,
        balance: balance > 0 ? balance : 0,
      };
    });

    return {
      totalCollected,
      expectedTotal: members.length * MONTHLY_EXPECTED_AMOUNT,
      memberReports,
    };
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberName.trim()) {
      alert("Please enter a member name");
      return;
    }
    if (
      members.some((m) => m.name.toLowerCase() === newMemberName.toLowerCase())
    ) {
      alert("Member already exists!");
      return;
    }
    setAddingMember(true);
    try {
      await addDoc(collection(db, "members"), {
        name: newMemberName.trim(),
      });
      setNewMemberName("");
      alert("Member added successfully!");
    } catch (error) {
      console.error("Error adding member:", error);
      alert("Error adding member. Please try again.");
    } finally {
      setAddingMember(false);
    }
  };

  const handleDeleteMember = async (memberId, memberName) => {
    if (!confirm(`Are you sure you want to delete ${memberName}?`)) return;

    try {
      await deleteDoc(doc(db, "members", memberId));
      alert("Member deleted successfully!");
    } catch (error) {
      console.error("Error deleting member:", error);
      alert("Error deleting member. Please try again.");
    }
  };

  const handleEditMember = async (memberId) => {
    if (!editMemberName.trim()) {
      alert("Please enter a member name");
      return;
    }

    try {
      await updateDoc(doc(db, "members", memberId), {
        name: editMemberName.trim(),
      });
      setEditingMember(null);
      setEditMemberName("");
      alert("Member updated successfully!");
    } catch (error) {
      console.error("Error updating member:", error);
      alert("Error updating member. Please try again.");
    }
  };

  const uploadImageToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const handleAddContribution = async (e) => {
    e.preventDefault();

    if (!selectedMember || !amount || amount <= 0) {
      alert("Please select a member and enter a valid amount");
      return;
    }

    setLoading(true);
    setUploading(true);

    try {
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImageToCloudinary(imageFile);
      }

      const selectedDate = new Date(contributionDate);

      await addDoc(collection(db, "contributions"), {
        memberName: selectedMember,
        amount: parseFloat(amount),
        date: selectedDate.toLocaleDateString(),
        timestamp: selectedDate,
        proofOfPayment: imageUrl,
      });

      setSelectedMember("");
      setAmount("");
      setImageFile(null);
      setContributionDate(new Date().toISOString().split("T")[0]);
      alert("Contribution added successfully!");
    } catch (error) {
      console.error("Error adding contribution:", error);
      alert("Error adding contribution. Please try again.");
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleDeleteContribution = async (contribId, memberName, amount) => {
    if (!confirm(`Delete ${memberName}'s contribution of ₱${amount}?`)) return;

    try {
      await deleteDoc(doc(db, "contributions", contribId));
      alert("Contribution deleted successfully!");
    } catch (error) {
      console.error("Error deleting contribution:", error);
      alert("Error deleting contribution. Please try again.");
    }
  };

  const handleEditContribution = async (contribId) => {
    if (!editContribAmount || editContribAmount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setLoading(true);

    try {
      let imageUrl = editingContribution.proofOfPayment;
      if (editContribImage) {
        imageUrl = await uploadImageToCloudinary(editContribImage);
      }

      await updateDoc(doc(db, "contributions", contribId), {
        amount: parseFloat(editContribAmount),
        proofOfPayment: imageUrl,
      });

      setEditingContribution(null);
      setEditContribAmount("");
      setEditContribImage(null);
      alert("Contribution updated successfully!");
    } catch (error) {
      console.error("Error updating contribution:", error);
      alert("Error updating contribution. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleQuickAmount = (value) => {
    setAmount(String(value));
  };

  const filteredContributions = contributions.filter((contrib) => {
    const nameMatch =
      !filterName ||
      contrib.memberName.toLowerCase().includes(filterName.toLowerCase());

    let dateMatch = true;
    if (filterDateFrom || filterDateTo) {
      const contribDate = new Date(
        contrib.timestamp?.toDate
          ? contrib.timestamp.toDate()
          : contrib.timestamp
      );
      const fromDate = filterDateFrom ? new Date(filterDateFrom) : null;
      const toDate = filterDateTo ? new Date(filterDateTo) : null;

      if (fromDate && toDate) {
        dateMatch = contribDate >= fromDate && contribDate <= toDate;
      } else if (fromDate) {
        dateMatch = contribDate >= fromDate;
      } else if (toDate) {
        dateMatch = contribDate <= toDate;
      }
    }

    return nameMatch && dateMatch;
  });

  const monthlyReport = generateMonthlyReport();

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <div className="dashboard">
      <div className="card title-card">
        <h1>💰 Group Savings Tracker</h1>
        <p>Track contributions for your group staycation fund</p>
      </div>

      <div className="card add-member-card">
        <h2>➕ Add New Member</h2>
        <form onSubmit={handleAddMember}>
          <input
            type="text"
            placeholder="Member name"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            disabled={addingMember}
          />
          <button type="submit" disabled={addingMember}>
            {addingMember ? "Adding..." : "Add Member"}
          </button>
        </form>
      </div>

      <div className="card members-card">
        <h2>👥 Members ({members.length})</h2>
        <div className="scrollable-content">
          {members.length === 0 ? (
            <p className="empty-state">No members yet</p>
          ) : (
            <ul>
              {members.map((member) => (
                <li key={member.id}>
                  {editingMember === member.id ? (
                    <div className="edit-form">
                      <input
                        type="text"
                        value={editMemberName}
                        onChange={(e) => setEditMemberName(e.target.value)}
                        className="edit-input"
                      />
                      <div className="edit-buttons">
                        <button
                          onClick={() => handleEditMember(member.id)}
                          className="btn-save"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => {
                            setEditingMember(null);
                            setEditMemberName("");
                          }}
                          className="btn-cancel"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="member-info">
                        <strong>{member.name}</strong>
                        <span>₱{getMemberTotal(member.name)}</span>
                      </div>
                      <div className="member-actions">
                        <button
                          onClick={() => {
                            setEditingMember(member.id);
                            setEditMemberName(member.name);
                          }}
                          className="btn-edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteMember(member.id, member.name)
                          }
                          className="btn-delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card history-card">
        <h2>📜 Recent Contributions</h2>

        <div className="filter-section">
          <input
            type="text"
            placeholder="Filter by name"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            className="filter-input"
          />
          <div className="date-filters">
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="filter-date"
            />
            <span>to</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="filter-date"
            />
          </div>
        </div>

        <div className="scrollable-content">
          {filteredContributions.length === 0 ? (
            <p className="empty-state">No contributions found</p>
          ) : (
            <div className="contrib-table">
              <div className="contrib-header">
                <span>Name</span>
                <span>Amount</span>
                <span>Date</span>
                <span>Proof</span>
                <span>Actions</span>
              </div>
              {filteredContributions.map((contrib) => (
                <div key={contrib.id} className="contrib-row">
                  {editingContribution === contrib.id ? (
                    <>
                      <span>{contrib.memberName}</span>
                      <input
                        type="number"
                        value={editContribAmount}
                        onChange={(e) => setEditContribAmount(e.target.value)}
                        className="edit-amount-input"
                      />
                      <span>{contrib.date}</span>
                      <div className="edit-proof">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            setEditContribImage(e.target.files[0])
                          }
                          className="edit-file-input"
                        />
                      </div>
                      <div className="contrib-actions">
                        <button
                          onClick={() => handleEditContribution(contrib.id)}
                          className="btn-save"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => {
                            setEditingContribution(null);
                            setEditContribAmount("");
                            setEditContribImage(null);
                          }}
                          className="btn-cancel"
                        >
                          ✕
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="contrib-name">{contrib.memberName}</span>
                      <span className="contrib-amount">₱{contrib.amount}</span>
                      <span className="contrib-date">{contrib.date}</span>
                      <span className="contrib-proof">
                        {contrib.proofOfPayment ? (
                          <a
                            href={contrib.proofOfPayment}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            📎
                          </a>
                        ) : (
                          <span className="no-proof">-</span>
                        )}
                      </span>
                      <div className="contrib-actions">
                        <button
                          onClick={() => {
                            setEditingContribution(contrib.id);
                            setEditContribAmount(String(contrib.amount));
                          }}
                          className="btn-edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteContribution(
                              contrib.id,
                              contrib.memberName,
                              contrib.amount
                            )
                          }
                          className="btn-delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card total-card">
        <h2>💵 Total Savings</h2>
        <div className="total-amount">₱{totalSavings.toLocaleString()}</div>
      </div>

      <div className="card add-contribution-card">
        <h2>💳 Add Contribution</h2>
        <form onSubmit={handleAddContribution}>
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            disabled={loading}
          >
            <option value="">Select Member</option>
            {members.map((member) => (
              <option key={member.id} value={member.name}>
                {member.name}
              </option>
            ))}
          </select>

          <div className="quick-amounts">
            <button
              type="button"
              onClick={() => handleQuickAmount(500)}
              className="quick-btn"
            >
              ₱500
            </button>
            <button
              type="button"
              onClick={() => handleQuickAmount(1000)}
              className="quick-btn"
            >
              ₱1000
            </button>
            <button
              type="button"
              onClick={() => handleQuickAmount(1500)}
              className="quick-btn"
            >
              ₱1500
            </button>
          </div>

          <input
            type="number"
            placeholder="Amount (Expected: ₱500)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={loading}
          />

          <input
            type="date"
            value={contributionDate}
            onChange={(e) => setContributionDate(e.target.value)}
            disabled={loading}
          />

          <div className="file-input-wrapper">
            <label>📷 Proof of Payment (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              disabled={loading}
            />
            {imageFile && <p className="file-selected">✓ {imageFile.name}</p>}
          </div>

          <button type="submit" disabled={loading}>
            {uploading
              ? "Uploading..."
              : loading
              ? "Adding..."
              : "Add Contribution"}
          </button>
        </form>
      </div>

      <div className="card monthly-report-card">
        <h2>📊 Monthly Report</h2>
        <div className="month-selector">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {monthNames.map((month, index) => (
              <option key={index} value={index + 1}>
                {month}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {[2024, 2025, 2026].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {monthlyReport && (
          <div className="scrollable-content">
            <div className="summary-info">
              <div className="summary-item">
                <span>Expected</span>
                <strong>₱{monthlyReport.expectedTotal}</strong>
              </div>
              <div className="summary-item">
                <span>Collected</span>
                <strong>₱{monthlyReport.totalCollected}</strong>
              </div>
              <div className="summary-item">
                <span>Shortfall</span>
                <strong>
                  ₱{monthlyReport.expectedTotal - monthlyReport.totalCollected}
                </strong>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {monthlyReport.memberReports.map((report, index) => (
                  <tr key={index}>
                    <td>{report.name}</td>
                    <td>₱{report.paidAmount}</td>
                    <td>₱{report.balance}</td>
                    <td>
                      <span
                        className={`status-badge status-${
                          report.status === "Paid Full"
                            ? "paid"
                            : report.status === "Partial"
                            ? "partial"
                            : "unpaid"
                        }`}
                      >
                        {report.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
