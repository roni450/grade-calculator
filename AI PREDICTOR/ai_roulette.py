import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

# Dummy historical data
data = {
    'player1_played': [1, 0, 1, 1, 0],
    'player2_played': [0, 1, 1, 0, 1],
    'player3_played': [1, 1, 0, 1, 0],
    'winner': [1, 2, 1, 3, 2]  # 1 = player1, 2 = player2, 3 = player3
}

df = pd.DataFrame(data)

# Features & Labels
X = df[['player1_played', 'player2_played', 'player3_played']]
y = df['winner']

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model
model = RandomForestClassifier()
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
print("🎯 Accuracy:", accuracy_score(y_test, y_pred))

# 🔮 Predict a new round (with probability prediction)
# Suppose in the new round: player1 played, player2 didn't, player3 played
new_data = pd.DataFrame([[1, 0, 1]], columns=['player1_played', 'player2_played', 'player3_played'])

# Predict class (who will win)
prediction = model.predict(new_data)

# Predict probability (how likely each player is to win)
probabilities = model.predict_proba(new_data)

# Print predictions and probabilities
print(f"🏆 AI predicts: Player{prediction[0]} has the highest chance to win.")
print("💡 Probability for each player:")
for i, prob in enumerate(probabilities[0]):
    print(f"  Player{i+1}: {prob*100:.2f}% chance")
