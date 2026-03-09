import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

export default function WorkInProgress() {
    const developer= require("../assets/images/dev.png")
  return (
    <View style={styles.container}>
      <Image
        source={developer}
        style={styles.image}
        resizeMode="contain"
      />

      <Text style={styles.title}>Feature Under Development</Text>

      <Text style={styles.subtitle}>
        This feature is currently being worked on. It will be available soon.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    // padding: 20,
    backgroundColor: "#fff",
  },
  image: {
    width: 220,
    height: 220,
    // marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
    color:"#0549a1"
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
  },
});