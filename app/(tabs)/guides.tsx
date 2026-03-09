import React from "react";
import { StyleSheet, Text, View } from "react-native";
import WorkInProgress from "../workinprogress";

export default function GuidesScreen() {
  return (
    <View style={styles.container}>
    <WorkInProgress />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F5F8",
  },
  text: {
    fontSize: 18,
    color: "#2A3F5F",
    fontWeight: "600",
  },
});
