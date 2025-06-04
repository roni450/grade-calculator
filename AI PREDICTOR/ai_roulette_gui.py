import tkinter as tk
from tkinter import messagebox
import random

# Spin history
spin_history = []

# Function to make prediction
def predict_winner():
    global spin_history

    # Get user input (spin result)
    try:
        spin_result = int(entry_spin.get())  # Get the spin result
    except ValueError:
        messagebox.showerror("Invalid Input", "Please enter a valid number for spin result.")
        return

    # Add the new spin result to history
    spin_history.append(spin_result)

    # Ensure history doesn't have more than 5 spins
    if len(spin_history) > 5:
        spin_history.pop(0)

    # Update the history display
    history_label.config(text=f"Spin History: {', '.join(map(str, spin_history))}")

    # If we have enough spins (5 spins), generate AI prediction
    if len(spin_history) == 5:
        # Simulate AI prediction by generating 7 random numbers (between 1 and 36)
        predictions = [random.randint(1, 36) for _ in range(7)]

        # Display prediction results in a separate frame
        prediction_result = "AI Predictions: \n"
        prediction_result += "\n".join([f"Prediction {i+1}: {predictions[i]}" for i in range(7)])
        
        prediction_label.config(text=prediction_result)
    else:
        prediction_label.config(text="")  # Clear predictions if less than 5 spins

# Create the main window
root = tk.Tk()
root.title("AI Spin Predictor")

# Create input field for entering spin result
tk.Label(root, text="Enter Spin result (number)").pack()
entry_spin = tk.Entry(root)
entry_spin.pack()

# Create button to trigger prediction
tk.Button(root, text="Enter Spin and Predict", command=predict_winner).pack()

# Label to show spin history
history_label = tk.Label(root, text="Spin History: ")
history_label.pack()

# Frame to show prediction results
prediction_frame = tk.Frame(root)
prediction_frame.pack(pady=10)

# Label to display prediction results
prediction_label = tk.Label(prediction_frame, text="Prediction Results will be shown here.", justify="left")
prediction_label.pack()

# Run the Tkinter event loop
root.mainloop()
