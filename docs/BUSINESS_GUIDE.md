# RAINBOW PACKAGES — BUSINESS OWNER & MANAGEMENT GUIDE

**System**: Rainbow Packages Reel Inventory Management System  
**Audience**: Company Owner, Directors, Plant Managers & Supervisors  
**Language**: Plain English & Hindi Explanations  
**Status**: ACTIVE  

---

## Executive Summary

Rainbow Packages plant me paper rolls (Reels) ki tracking aur inventory management ko aasan, accurate aur fast banane ke liye ye system design kiya gaya hai.

Is system me char mukhya (4 core) cheezein hain jinko samajhna zaroori hai:

```text
┌─────────────────────────────────────────────────────────┐
│ 1. BUSINESS MASTER CODE                                 │
│    Simple Business Catalog Code (e.g. Master Code 7)    │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ 2. TECHNICAL MASTER KEY                                 │
│    Technical Material Identity (e.g. VK-G120-BF18-S100) │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ 3. PHYSICAL REEL NUMBER                                 │
│    Individual Paper Roll Barcode (e.g. Reel #R-2201)    │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│ 4. REEL EVENTS                                          │
│    Transaction History (Receive, Usage, Return)         │
└────────────────────────────┴────────────────────────────┘
```

---

## 1. What is Master Code? (Master Code kya hai?)

**Master Code** ko business aur factory storekeeping ka simple item code samajhiye.

- **Example**: `Master Code 1`, `Master Code 7`, `Master Code 19`, `Master Code 20`
- **Kyu hai?**: Plant me kaam karne wale operator ke liye aasan number hai. Operator ko har baar lambi technical details type nahi karni padti.
- **Kaun chunata hai?**: Operator Reel banate waqt **Master Code select karta hai**.
- **Kitne Master Codes ho sakte hain?**: Shuru me dataset me **1 se 19** tak hain. Aage jaakar jab bhi naya material aayega, Admin ya Supervisor **Master Code 20, 21, 22...** naya bana sakte hain.

---

## 2. What is Master Key? (Master Key kya hai?)

**Technical Master Key** material ki exact technical specification ki identity hai.

- **Formula**: `Quality + GSM + BF + Size`
- **Example**: Quality `VK`, GSM `120`, BF `18`, Size `100` $\implies$ **`VK-G120-BF18-S100`**
- **Kaun banata hai?**: **System automatically calculate karta hai**. Operator ise manually type ya select nahi karta.

---

## 3. What is a Reel Number? (Reel Number kya hai?)

**Reel Number** godown me rakhi actual physical paper roll ki identification hai (Jaise `Reel #R-2201`, `Reel #R-2202`).

---

## 4. Why Do We Need Both Master Code and Master Key?

| Question | Business Concept | Answer |
| :--- | :--- | :--- |
| **Kaunsa item category hai?** | Business Master Code | `Master Code 7` |
| **Exact technical specification kya hai?** | Technical Master Key | `VK-G120-BF18-S100` |
| **Kaunsi physical roll godown me hai?** | Reel Number | `Reel #R-2201` |
| **Roll ke saath kya hua?** | Reel Event | `Usage 20 kg logged` |

---

## 5. Why Can Multiple Reels Have the Same Master Key?

Agar godown me exact same paper spec (VK, 120 GSM, 18 BF, 100 cm) ki **10 rolls** aati hain:

- Un sabhi 10 rolls ka **Business Master Code**: Same hoga (`7`).
- Un sabhi 10 rolls ka **Technical Master Key**: Same hoga (`VK-G120-BF18-S100`).
- Lekin un sabhi 10 rolls ka **Reel Number**: Alag-alag hoga (`R-1001`, `R-1002`, ..., `R-1010`).

Iss tarah system aapko batata hai ki `VK-G120-BF18-S100` ka Total Available Weight kitna hai!

---

## 6. Reel Creation Flow for Operators (Shopfloor Steps)

```text
Step 1: Operator selects Master Code 7 from dropdown
                 ↓
Step 2: System pre-fills Quality (VK), GSM (120), BF (18), Size (100)
                 ↓
Step 3: System displays Read-Only Master Key (VK-G120-BF18-S100)
                 ↓
Step 4: Operator enters Reel No (R-2201) & Weight (1000 kg)
```

1. Operator **Master Code** chunata hai.
2. System technical details apne aap fill kar deta hai.
3. System read-only **Technical Master Key** dikhata hai (operator ise badal nahi sakta).
4. Operator reel weight aur number daalkar submit kar deta hai.

---

## 7. Roles & Permissions Summary

- **OPERATOR**: Reel create kar sakta hai, usage record kar sakta hai, dashboard dekh sakta hai.
- **SUPERVISOR**: Operator ke entries confirm ya decline kar sakta hai, naye **Master Codes** add/manage kar sakta hai.
- **ADMIN**: All rights — weight master correction, void reel, user management, daily email digest settings.
