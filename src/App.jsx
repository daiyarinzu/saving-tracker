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

  // New member form
  const [newMemberName, setNewMemberName] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  // Load members from Firebase in real-time
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

  // Load contributions from Firebase in real-time
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

  const totalSavings = contributions.reduce(
    (sum, contrib) => sum + contrib.amount,
    0
  );

  const getMemberTotal = (memberName) => {
    return contributions
      .filter((contrib) => contrib.memberName === memberName)
      .reduce((sum, contrib) => sum + contrib.amount, 0);
  };

  // Add new member
  const handleAddMember = async (e) => {
    e.preventDefault();

    if (!newMemberName.trim()) {
      alert("Please enter a member name");
      return;
    }

    // Check if member already exists
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

  const handleAddContribution = async (e) => {
    e.preventDefault();

    if (!selectedMember || !amount || amount <= 0) {
      alert("Please select a member and enter a valid amount");
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, "contributions"), {
        memberName: selectedMember,
        amount: parseFloat(amount),
        date: new Date().toLocaleDateString(),
        timestamp: new Date(),
      });

      setSelectedMember("");
      setAmount("");
      alert("Contribution added successfully!");
    } catch (error) {
      console.error("Error adding contribution:", error);
      alert("Error adding contribution. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>Group Savings Tracker</h1>
      <p>Track contributions for your group staycation fund!</p>

      <h2>Total Savings: ₱{totalSavings}</h2>

      {/* Add New Member Form */}
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

      {/* Add Contribution Form */}
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
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={loading}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add Contribution"}
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
              {member.name} - Contributed: ₱{getMemberTotal(member.name)}
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
