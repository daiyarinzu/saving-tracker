import { useState, useEffect } from "react";
import "./App.css";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

function App() {
  const [members, setMembers] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [selectedMember, setSelectedMember] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Monthly report states
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

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

  // Set current month and year on load
  useEffect(() => {
    const now = new Date();
    setSelectedMonth(String(now.getMonth() + 1));
    setSelectedYear(String(now.getFullYear()));
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

  // Get contributions for a specific month
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

  // Get member's total for specific month
  const getMemberMonthlyTotal = (memberName, month, year) => {
    const monthlyContribs = getMonthlyContributions(month, year);
    return monthlyContribs
      .filter((contrib) => contrib.memberName === memberName)
      .reduce((sum, contrib) => sum + contrib.amount, 0);
  };

  // Generate monthly report
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

      await addDoc(collection(db, "contributions"), {
        memberName: selectedMember,
        amount: parseFloat(amount),
        date: new Date().toLocaleDateString(),
        timestamp: new Date(),
        proofOfPayment: imageUrl,
      });

      setSelectedMember("");
      setAmount("");
      setImageFile(null);
      alert("Contribution added successfully!");
    } catch (error) {
      console.error("Error adding contribution:", error);
      alert("Error adding contribution. Please try again.");
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

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
    <div className="App">
      <h1>Group Savings Tracker</h1>
      <p>Track contributions for your group staycation fund!</p>

      <h2>Total Savings: ₱{totalSavings}</h2>

      {/* Monthly Report Section */}
      <div
        style={{
          border: "2px solid #2563eb",
          padding: "20px",
          marginBottom: "20px",
          borderRadius: "8px",
        }}
      >
        <h2>📊 Monthly Report</h2>
        <div>
          <label>Select Month: </label>
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

          <label> Year: </label>
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
          <div>
            <h3>
              {monthNames[parseInt(selectedMonth) - 1]} {selectedYear} Summary
            </h3>
            <p>
              <strong>Expected Total:</strong> ₱{monthlyReport.expectedTotal}
            </p>
            <p>
              <strong>Collected:</strong> ₱{monthlyReport.totalCollected}
            </p>
            <p>
              <strong>Shortfall:</strong> ₱
              {monthlyReport.expectedTotal - monthlyReport.totalCollected}
            </p>

            <h3>Member Status</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #2563eb" }}>
                  <th style={{ textAlign: "left", padding: "8px" }}>Member</th>
                  <th style={{ textAlign: "right", padding: "8px" }}>Paid</th>
                  <th style={{ textAlign: "right", padding: "8px" }}>
                    Balance
                  </th>
                  <th style={{ textAlign: "center", padding: "8px" }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthlyReport.memberReports.map((report, index) => (
                  <tr key={index} style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "8px" }}>{report.name}</td>
                    <td style={{ textAlign: "right", padding: "8px" }}>
                      ₱{report.paidAmount}
                    </td>
                    <td style={{ textAlign: "right", padding: "8px" }}>
                      ₱{report.balance}
                    </td>
                    <td style={{ textAlign: "center", padding: "8px" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          backgroundColor:
                            report.status === "Paid Full"
                              ? "#10b981"
                              : report.status === "Partial"
                              ? "#f59e0b"
                              : "#ef4444",
                          color: "white",
                          fontSize: "12px",
                        }}
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

      <div>
        <h2>Add New Member</h2>
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

      <div>
        <h2>Add Contribution</h2>
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

          <input
            type="number"
            placeholder="Amount (Expected: ₱500)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={loading}
          />

          <div>
            <label>Proof of Payment (optional):</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              disabled={loading}
            />
            {imageFile && <p>Selected: {imageFile.name}</p>}
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

      <h2>Members ({members.length})</h2>
      {members.length === 0 ? (
        <p>No members yet. Add your first member above!</p>
      ) : (
        <ul>
          {members.map((member) => (
            <li key={member.id}>
              {member.name} - Total Contributed: ₱{getMemberTotal(member.name)}
            </li>
          ))}
        </ul>
      )}

      <h2>Recent Contributions</h2>
      {contributions.length === 0 ? (
        <p>No contributions yet</p>
      ) : (
        <ul>
          {contributions.map((contrib) => (
            <li key={contrib.id}>
              {contrib.memberName} contributed ₱{contrib.amount} on{" "}
              {contrib.date}
              {contrib.proofOfPayment && (
                <div>
                  <a
                    href={contrib.proofOfPayment}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Proof of Payment
                  </a>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
