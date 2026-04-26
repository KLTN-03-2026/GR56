import { createRef } from "react";
import { NavigationContainerRef, ParamListBase } from "@react-navigation/native";

const navigationRef = createRef<NavigationContainerRef<ParamListBase>>();

export default navigationRef;
