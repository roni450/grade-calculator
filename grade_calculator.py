import tkinter as tk
from tkinter import messagebox

def calculate_grade():
    try:
        marks = float(entry.get())
        if marks >= 80:
            grade = "A+"
        elif marks >= 70:
            grade = "A"
        elif marks >= 60:
            grade = "A-"
        elif marks >= 50:
            grade = "B"
        elif marks >= 40:
            grade = "C"
        else:
            grade = "F"
        result_label.config(text=f"Your Grade: {grade}")
    except ValueError:
        messagebox.showerror("Invalid Input", "Please enter a number.")

root = tk.Tk()
root.title("Student Grade Calculator")
root.geometry("300x200")

tk.Label(root, text="Enter Marks (0-100):").pack(pady=10)
entry = tk.Entry(root)
entry.pack()

tk.Button(root, text="Calculate", command=calculate_grade).pack(pady=10)

result_label = tk.Label(root, text="")
result_label.pack(pady=10)

root.mainloop()
