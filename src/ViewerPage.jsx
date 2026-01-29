import { useState, useEffect } from "react";
import "./App.css";
import { db } from "./firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import {
  Wallet,
  Users,
  History,
  PiggyBank,
  FileText,
  ExternalLink,
  X,
} from "lucide-react";

// Move SkeletonLoader OUTSIDE the component
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

// Helper function to get initial month/year
const getInitialMonth = () => String(new Date().getMonth() + 1);
const getInitialYear = () => String(new Date().getFullYear());

function ViewerPage() {
  const [members, setMembers] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(getInitialMonth);
  const [selectedYear, setSelectedYear] = useState(getInitialYear);
  const [showReportModal, setShowReportModal] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [dataLoading, setDataLoading] = useState(true);

  const MONTHLY_EXPECTED_AMOUNT = 500;

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

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <Wallet size={32} />
            <div>
              <h1>Group Savings Tracker</h1>
              <p>View-only mode</p>
            </div>
          </div>
          <span className="viewer-badge">👁️ Viewer Mode</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content viewer-content">
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
                  <p>Members will appear here</p>
                </div>
              ) : (
                <ul className="member-list">
                  {members.map((member) => (
                    <li key={member.id} className="member-item viewer-item">
                      <div className="member-info">
                        <span className="member-name">{member.name}</span>
                        <span className="member-total">
                          ₱{getMemberTotal(member.name).toLocaleString()}
                        </span>
                      </div>
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
                    <div key={contrib.id} className="contrib-item viewer-item">
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
              <button
                className="btn-icon modal-close"
                onClick={() => setShowReportModal(false)}
                aria-label="Close modal"
              >
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
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
                      <span className="summary-label">Shortfall</span>
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

export default ViewerPage;
