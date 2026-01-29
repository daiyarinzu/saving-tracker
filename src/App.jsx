import { useState, useEffect, useRef } from "react";
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
import toast, { Toaster } from "react-hot-toast";
import html2canvas from "html2canvas";
import {
  Wallet,
  UserPlus,
  Users,
  History,
  PiggyBank,
  CreditCard,
  FileText,
  Upload,
  Pencil,
  Trash2,
  Check,
  X,
  ExternalLink,
  Sun,
  Moon,
  Download,
} from "lucide-react";

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
  const [showReportModal, setShowReportModal] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);
  const reportRef = useRef(null);

  const CLOUDINARY_CLOUD_NAME = "drvx9vxpc";
  const CLOUDINARY_UPLOAD_PRESET = "savings_tracker";
  const MONTHLY_EXPECTED_AMOUNT = 500;

  // Dark mode effect
  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
  }, [darkMode]);

  useEffect(() => {
    const q = query(collection(db, "members"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const membersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMembers(membersData);
      setDataLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "contributions"),
      orderBy("createdAt", "desc"),
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
    0,
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
      selectedYear,
    );
    const totalCollected = monthlyContribs.reduce(
      (sum, contrib) => sum + contrib.amount,
      0,
    );

    const memberReports = members.map((member) => {
      const paidAmount = getMemberMonthlyTotal(
        member.name,
        selectedMonth,
        selectedYear,
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
      toast.error("Please enter a member name");
      return;
    }
    if (
      members.some((m) => m.name.toLowerCase() === newMemberName.toLowerCase())
    ) {
      toast.error("Member already exists!");
      return;
    }
    setAddingMember(true);
    try {
      await addDoc(collection(db, "members"), {
        name: newMemberName.trim(),
      });
      setNewMemberName("");
      toast.success("Member added successfully!");
    } catch (error) {
      console.error("Error adding member:", error);
      toast.error("Error adding member. Please try again.");
    } finally {
      setAddingMember(false);
    }
  };

  const handleDeleteMember = async (memberId, memberName) => {
    if (!confirm(`Are you sure you want to delete ${memberName}?`)) return;

    try {
      await deleteDoc(doc(db, "members", memberId));
      toast.success("Member deleted successfully!");
    } catch (error) {
      console.error("Error deleting member:", error);
      toast.error("Error deleting member. Please try again.");
    }
  };

  const handleEditMember = async (memberId) => {
    if (!editMemberName.trim()) {
      toast.error("Please enter a member name");
      return;
    }

    try {
      await updateDoc(doc(db, "members", memberId), {
        name: editMemberName.trim(),
      });
      setEditingMember(null);
      setEditMemberName("");
      toast.success("Member updated successfully!");
    } catch (error) {
      console.error("Error updating member:", error);
      toast.error("Error updating member. Please try again.");
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
        },
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
      toast.error("Please select a member and enter a valid amount");
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
        createdAt: new Date(),
        proofOfPayment: imageUrl,
      });

      setSelectedMember("");
      setAmount("");
      setImageFile(null);
      setContributionDate(new Date().toISOString().split("T")[0]);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast.success("Contribution added successfully!");
    } catch (error) {
      console.error("Error adding contribution:", error);
      toast.error("Error adding contribution. Please try again.");
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleDeleteContribution = async (contribId, memberName, amount) => {
    if (!confirm(`Delete ${memberName}'s contribution of ₱${amount}?`)) return;

    try {
      await deleteDoc(doc(db, "contributions", contribId));
      toast.success("Contribution deleted successfully!");
    } catch (error) {
      console.error("Error deleting contribution:", error);
      toast.error("Error deleting contribution. Please try again.");
    }
  };

  const handleEditContribution = async (contribId) => {
    if (!editContribAmount || editContribAmount <= 0) {
      toast.error("Please enter a valid amount");
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

      if (editFileInputRef.current) {
        editFileInputRef.current.value = "";
      }

      toast.success("Contribution updated successfully!");
    } catch (error) {
      console.error("Error updating contribution:", error);
      toast.error("Error updating contribution. Please try again.");
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

  const handleScreenshot = async () => {
    if (!reportRef.current) return;

    try {
      const loadingToast = toast.loading("Generating screenshot...");

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Store original styles
      const originalStyle = reportRef.current.style.cssText;

      // Temporarily remove height/overflow restrictions
      reportRef.current.style.overflow = "visible";
      reportRef.current.style.maxHeight = "none";
      reportRef.current.style.height = "auto";

      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: darkMode ? "#1f2937" : "#ffffff",
        scale: 2,
        logging: false,
        useCORS: true,
        scrollY: 0,
        scrollX: 0,
        windowHeight: reportRef.current.scrollHeight,
      });

      // Restore original styles
      reportRef.current.style.cssText = originalStyle;

      const link = document.createElement("a");
      link.download = `savings-report-${monthNames[selectedMonth - 1]}-${selectedYear}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast.dismiss(loadingToast);
      toast.success("Screenshot downloaded!");
    } catch (error) {
      console.error("Screenshot error:", error);
      toast.error("Failed to take screenshot");

      // Restore styles on error too
      if (reportRef.current) {
        reportRef.current.style.cssText = "";
      }
    }
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
          : contrib.timestamp,
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

  // Skeleton loader component
  const SkeletonLoader = ({ count = 3 }) => (
    <>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="skeleton-item">
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton skeleton-text-small"></div>
        </div>
      ))}
    </>
  );

  return (
    <div className={`dashboard ${darkMode ? "dark" : ""}`}>
      {/* Toast Container */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: darkMode ? "#1f2937" : "#fff",
            color: darkMode ? "#fff" : "#333",
            borderRadius: "10px",
            padding: "16px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
          },
          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />

      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <Wallet size={32} />
            <div>
              <h1>Group#123456 Savings</h1>
              <p>Para dili hantod sabot ang laag!</p>
            </div>
          </div>
          <button
            className="theme-toggle"
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun size={22} /> : <Moon size={22} />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Left Column */}
        <div className="left-column">
          {/* Total Savings Card */}
          <div className="card total-card">
            <div className="card-header">
              <PiggyBank size={24} />
              <h2>Total Savings</h2>
            </div>
            <div className="total-amount">₱{totalSavings.toLocaleString()}</div>
            <p className="total-subtext">
              From {contributions.length} contributions
            </p>
          </div>

          {/* Add Member Card */}
          <div className="card">
            <div className="card-header">
              <UserPlus size={24} />
              <h2>Add New Member</h2>
            </div>
            <form onSubmit={handleAddMember} className="form">
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Enter member name"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  disabled={addingMember}
                  className="input"
                />
              </div>
              <button
                type="submit"
                disabled={addingMember}
                className="btn btn-primary"
              >
                {addingMember ? "Adding..." : "Add Member"}
              </button>
            </form>
          </div>

          {/* Add Contribution Card */}
          <div className="card">
            <div className="card-header">
              <CreditCard size={24} />
              <h2>Add Contribution</h2>
            </div>
            <form onSubmit={handleAddContribution} className="form">
              <div className="input-group">
                <label>Member</label>
                <select
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  disabled={loading}
                  className="input"
                >
                  <option value="">Select Member</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.name}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Quick Amount</label>
                <div className="quick-amounts">
                  {[500, 1000, 1500].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleQuickAmount(value)}
                      className={`quick-btn ${
                        amount === String(value) ? "active" : ""
                      }`}
                    >
                      ₱{value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label>Amount</label>
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loading}
                  className="input"
                />
              </div>

              <div className="input-group">
                <label>Date</label>
                <input
                  type="date"
                  value={contributionDate}
                  onChange={(e) => setContributionDate(e.target.value)}
                  disabled={loading}
                  className="input"
                />
              </div>

              <div className="input-group">
                <label>Proof of Payment (optional)</label>
                <div
                  className={`file-drop-zone ${imageFile ? "has-file" : ""}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={24} />
                  {imageFile ? (
                    <p>{imageFile.name}</p>
                  ) : (
                    <p>Click to upload image</p>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={loading}
                    ref={fileInputRef}
                    hidden
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
              >
                {uploading
                  ? "Uploading..."
                  : loading
                    ? "Adding..."
                    : "Add Contribution"}
              </button>
            </form>
          </div>

          {/* Generate Report Button */}
          <button
            className="btn btn-secondary generate-report-btn"
            onClick={() => setShowReportModal(true)}
          >
            <FileText size={20} />
            Generate Monthly Report
          </button>
        </div>

        {/* Middle Column - Members */}
        <div className="middle-column">
          <div className="card full-height">
            <div className="card-header">
              <Users size={24} />
              <h2>Members ({members.length})</h2>
            </div>
            <div className="scrollable-content">
              {dataLoading ? (
                <SkeletonLoader count={5} />
              ) : members.length === 0 ? (
                <div className="empty-state">
                  <Users size={48} />
                  <h3>No members yet</h3>
                  <p>Add your first member to get started</p>
                </div>
              ) : (
                <ul className="member-list">
                  {members.map((member) => (
                    <li key={member.id} className="member-item">
                      {editingMember === member.id ? (
                        <div className="edit-form">
                          <input
                            type="text"
                            value={editMemberName}
                            onChange={(e) => setEditMemberName(e.target.value)}
                            className="input"
                            autoFocus
                          />
                          <div className="edit-buttons">
                            <button
                              onClick={() => handleEditMember(member.id)}
                              className="btn-icon btn-save"
                              aria-label="Save"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingMember(null);
                                setEditMemberName("");
                              }}
                              className="btn-icon btn-cancel"
                              aria-label="Cancel"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="member-info">
                            <span className="member-name">{member.name}</span>
                            <span className="member-total">
                              ₱{getMemberTotal(member.name).toLocaleString()}
                            </span>
                          </div>
                          <div className="member-actions">
                            <button
                              onClick={() => {
                                setEditingMember(member.id);
                                setEditMemberName(member.name);
                              }}
                              className="btn-icon btn-edit"
                              aria-label="Edit member"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteMember(member.id, member.name)
                              }
                              className="btn-icon btn-delete"
                              aria-label="Delete member"
                            >
                              <Trash2 size={16} />
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
        </div>

        {/* Right Column - Contributions */}
        <div className="right-column">
          <div className="card full-height">
            <div className="card-header">
              <History size={24} />
              <h2>Recent Contributions</h2>
            </div>

            <div className="filter-section">
              <input
                type="text"
                placeholder="Search by name..."
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="input"
              />
              <div className="date-filters">
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="input"
                />
                <span>to</span>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div className="scrollable-content">
              {filteredContributions.length === 0 ? (
                <div className="empty-state">
                  <History size={48} />
                  <h3>No contributions found</h3>
                  <p>Contributions will appear here</p>
                </div>
              ) : (
                <div className="contrib-list">
                  {filteredContributions.map((contrib) => (
                    <div key={contrib.id} className="contrib-item">
                      {editingContribution === contrib.id ? (
                        <div className="contrib-edit-form">
                          <div className="contrib-edit-row">
                            <span className="contrib-name">
                              {contrib.memberName}
                            </span>
                            <input
                              type="number"
                              value={editContribAmount}
                              onChange={(e) =>
                                setEditContribAmount(e.target.value)
                              }
                              className="input input-small"
                              placeholder="Amount"
                            />
                          </div>
                          <div
                            className={`file-drop-zone small ${
                              editContribImage ? "has-file" : ""
                            }`}
                            onClick={() => editFileInputRef.current?.click()}
                          >
                            <Upload size={16} />
                            <span>
                              {editContribImage
                                ? editContribImage.name
                                : "Change proof"}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                setEditContribImage(e.target.files[0])
                              }
                              ref={editFileInputRef}
                              hidden
                            />
                          </div>
                          <div className="edit-buttons">
                            <button
                              onClick={() => handleEditContribution(contrib.id)}
                              className="btn-icon btn-save"
                              aria-label="Save"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingContribution(null);
                                setEditContribAmount("");
                                setEditContribImage(null);
                              }}
                              className="btn-icon btn-cancel"
                              aria-label="Cancel"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="contrib-main">
                            <span className="contrib-name">
                              {contrib.memberName}
                            </span>
                            <span className="contrib-amount">
                              ₱{contrib.amount.toLocaleString()}
                            </span>
                          </div>
                          <div className="contrib-meta">
                            <span className="contrib-date">{contrib.date}</span>
                            {contrib.proofOfPayment && (
                              <a
                                href={contrib.proofOfPayment}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="proof-link"
                              >
                                <ExternalLink size={14} />
                                Proof
                              </a>
                            )}
                          </div>
                          <div className="contrib-actions">
                            <button
                              onClick={() => {
                                setEditingContribution(contrib.id);
                                setEditContribAmount(String(contrib.amount));
                              }}
                              className="btn-icon btn-edit"
                              aria-label="Edit contribution"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteContribution(
                                  contrib.id,
                                  contrib.memberName,
                                  contrib.amount,
                                )
                              }
                              className="btn-icon btn-delete"
                              aria-label="Delete contribution"
                            >
                              <Trash2 size={16} />
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
        </div>
      </main>

      {/* Report Modal */}
      {showReportModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowReportModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <FileText size={24} />
                <h2>Monthly Report</h2>
              </div>
              <div className="modal-header-actions">
                <button
                  className="btn-icon modal-screenshot"
                  onClick={handleScreenshot}
                  aria-label="Download screenshot"
                >
                  <Download size={20} />
                </button>
                <button
                  className="btn-icon modal-close"
                  onClick={() => setShowReportModal(false)}
                  aria-label="Close modal"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="modal-body" ref={reportRef}>
              <div className="month-selector">
                <div className="input-group">
                  <label>Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="input"
                  >
                    {monthNames.map((month, index) => (
                      <option key={index} value={index + 1}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="input"
                  >
                    {[2024, 2025, 2026].map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {monthlyReport && (
                <>
                  <div className="summary-cards">
                    <div className="summary-card">
                      <span className="summary-label">Expected</span>
                      <span className="summary-value">
                        ₱{monthlyReport.expectedTotal.toLocaleString()}
                      </span>
                    </div>
                    <div className="summary-card success">
                      <span className="summary-label">Collected</span>
                      <span className="summary-value">
                        ₱{monthlyReport.totalCollected.toLocaleString()}
                      </span>
                    </div>
                    <div className="summary-card danger">
                      <span className="summary-label">Short</span>
                      <span className="summary-value">
                        ₱
                        {(
                          monthlyReport.expectedTotal -
                          monthlyReport.totalCollected
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="report-table-wrapper">
                    <table className="report-table">
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
                            <td className="member-cell">{report.name}</td>
                            <td>₱{report.paidAmount.toLocaleString()}</td>
                            <td>₱{report.balance.toLocaleString()}</td>
                            <td>
                              <span
                                className={`status-badge ${
                                  report.status === "Paid Full"
                                    ? "status-paid"
                                    : report.status === "Partial"
                                      ? "status-partial"
                                      : "status-unpaid"
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
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
