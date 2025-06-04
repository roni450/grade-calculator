import pmdarima as pm
import numpy as np

# Initialize an empty list for spin history (last 10 spins)
spin_history = []

# Function to get prediction based on ARIMA or pmdarima
def get_prediction(spin_history):
    # Ensure that we have enough data points (at least 10 spins)
    if len(spin_history) < 10:
        print("Not enough data for prediction. Please provide more spin history.")
        return None
    
    # Convert the history to a numpy array (required for ARIMA)
    spin_array = np.array(spin_history)

    # Fit the pmdarima model without seasonal differencing
    model = pm.auto_arima(spin_array, seasonal=False, trace=True, error_action='ignore', suppress_warnings=True)
    
    # Forecast the next value (1 step ahead)
    forecast = model.predict(n_periods=1)
    return forecast[0]

# Function to add a new spin and make a prediction
def update_and_predict(new_spin):
    global spin_history
    # Add the new spin to the history
    spin_history.append(new_spin)
    
    # Ensure history is only the last 10 spins
    if len(spin_history) > 10:
        spin_history = spin_history[1:]
    
    # Get the prediction based on the latest history
    prediction = get_prediction(spin_history)
    
    if prediction is not None:
        # Output the prediction
        print(f"Predicted next spin: {prediction}")
    else:
        print("Waiting for more data to make a prediction.")
    return prediction

# Example of continuous spin input (This would run continuously in your app)
new_spins = [26, 14, 32, 35, 12, 7, 3, 9, 19, 28]  # Example of spins coming in continuously

# Input spins one by one
for spin in new_spins:
    print(f"New spin result: {spin}")
    prediction = update_and_predict(spin)
    print(f"Prediction after {len(spin_history)} spins: {prediction}\n")
