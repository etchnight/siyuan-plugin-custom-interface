export const switchEle = (): HTMLInputElement => {
  let ele = document.createElement("input");
  ele.className = "b3-switch fn__flex-center";
  ele.type = "checkbox";
  return ele;
};
