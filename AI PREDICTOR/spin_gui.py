import tkinter as tk
import csv
import os
import random

CSV_FILE = 'spin_history.csv'

# Create the CSV file if it doesn't exist
if not os.path.exists(CSV_FILE):
    with open(CSV_FILE, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(['Spin'])  # header

# Function to save the spin result to the CSV file
def save_spin():
    spin = entry.get()
    if not spin.isdigit() or not (0 <= int(spin) <= 36):
        result_label.config(text="❌ Please enter a number between 0 and 36.")
        return

    with open(CSV_FILE, mode='a', newline='') as file:
        writer = csv.writer(file)
        writer.writerow([spin])

    entry.delete(0, tk.END)
    result_label.config(text="✅ Spin has been saved!")
    update_history()  # Update history after saving the spin
    generate_prediction()  # Generate predictions after saving a spin

# Function to update the spin history
def update_history():
    with open(CSV_FILE, mode='r', encoding='utf-8') as file:
        reader = csv.reader(file)
        next(reader)  # Skip the header
        
        # Only process rows that contain valid data (valid spin results)
        spins = []
        for row in reader:
            try:
                spin = int(row[0])  # Try to convert to integer
                if 0 <= spin <= 36:  # Only add valid spins (0-36)
                    spins.append(spin)
            except ValueError:  # Skip invalid entries that cannot be converted to int
                continue

    if not spins:  # If no valid data is present in the file
        history_text.set("Spin History:\nNo data yet.")
    else:
        history_text.set("Spin History:\n" + ", ".join(map(str, spins[-50:])))  # Show the last 50 spins

# Function to generate predictions based on spin history
def generate_prediction():
    # Get the spin history
    with open(CSV_FILE, mode='r', encoding='utf-8') as file:
        reader = csv.reader(file)
        next(reader)  # Skip the header
        
        # Ensure only valid spins (numbers between 0-36) are processed
        spins = []
        for row in reader:
            try:
                spin = int(row[0])  # Try to convert to integer
                if 0 <= spin <= 36:  # Only add valid spins (0-36)
                    spins.append(spin)
            except ValueError:  # Skip invalid entries that cannot be converted to int
                continue

    if len(spins) < 5:  # If there are less than 5 spins, don't generate prediction
        prediction_text.set("Prediction: Not enough data.")
        return

    # Simple prediction: Predict numbers based on frequency of past spins
    spin_counts = {i: spins.count(i) for i in range(37)}  # Count occurrences of each number from 0 to 36
    sorted_spins = sorted(spin_counts.items(), key=lambda x: x[1], reverse=True)  # Sort by frequency

    # Get the top 7 most frequent spins (just as an example prediction)
    prediction = [str(item[0]) for item in sorted_spins[:7]]

    prediction_text.set("Prediction:\n" + ", ".join(prediction))  # Display the predictions

# Create the GUI
root = tk.Tk()
root.title("🎰 Spin Result Collector & Prediction")
root.geometry("400x400")

# Label for spin input
tk.Label(root, text="🎲 Enter Spin Result (0-36):", font=("Arial", 12)).pack(pady=10)

# Entry field for entering spin result
entry = tk.Entry(root, font=("Arial", 14))
entry.pack()

# Button to save spin result
tk.Button(root, text="✅ Save Spin", command=save_spin, font=("Arial", 12)).pack(pady=5)

# Label for showing result of saving spin
result_label = tk.Label(root, text="", font=("Arial", 10))
result_label.pack()

# StringVar to hold spin history text
history_text = tk.StringVar()
history_label = tk.Label(root, textvariable=history_text, justify="left", wraplength=350, font=("Arial", 10))
history_label.pack(pady=10)

# StringVar to hold prediction text
prediction_text = tk.StringVar()  # For predictions
prediction_label = tk.Label(root, textvariable=prediction_text, justify="left", wraplength=350, font=("Arial", 12, "bold"), fg="green")
prediction_label.pack(pady=10)

# Initial setup: show history and predictions
update_history()  # Show the history initially
generate_prediction()  # Generate initial predictions

# Start the Tkinter event loop
root.mainloop()
