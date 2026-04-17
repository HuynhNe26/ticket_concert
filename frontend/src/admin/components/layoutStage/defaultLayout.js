const defaultLayout = {
  canvas: {
    width: 1200,
    height: 700,
    background: "#000000",
  },
  zones: [
    {
      id: "STAGE",
      name: "STAGE",
      shape: "rect",
      x: 300,
      y: 30,
      width: 600,
      height: 70,
      color: "#555555",
      status: false,
    },
    {
      id: "FANZONE_A",
      name: "FANZONE A",
      shape: "rect",
      x: 200,
      y: 150,
      width: 250,
      height: 260,
      color: "#00C7D9",
      price: 2000000,
      total_quantity: 800,
      status: true,
    },
  ],
};

export default defaultLayout;
