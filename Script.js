class OrderController {
  constructor() {
    this.dialog = document.getElementById('order-dialog');
    this.closeBtn = document.getElementById('dialog-close-btn');
    this.cartCountElement = document.getElementById('cart-count');
    this.init();
  }

  init() {
    this.closeBtn.addEventListener('click', () => this.closeModal());
    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) this.closeModal();
    });
  }

  processOrder() {
    // Show the success modal
    this.dialog.showModal();
    
    // Reset the cart visually for this demo
    this.cartCountElement.innerText = "0";
  }

  closeModal() {
    this.dialog.close();
  }
}

// Make the controller globally accessible so the HTML buttons can use it
let orderManager;
document.addEventListener('DOMContentLoaded', () => {
  orderManager = new OrderController();
});
