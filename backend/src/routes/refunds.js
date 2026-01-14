import express from "express";
import { authenticateMerchant } from "../middleware/auth.js";
import { getRefund } from "../services/payment.service.js";

const router = express.Router();

// GET /api/v1/refunds/{refund_id}
router.get("/:refund_id", authenticateMerchant, async (req, res) => {
  try {
    const { refund_id } = req.params;

    const result = await getRefund({
      refundId: refund_id,
      merchantId: req.merchant.id
    });

    if (!result) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND_ERROR",
          description: "Refund not found"
        }
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("Get refund error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        description: "Failed to fetch refund"
      }
    });
  }
});

export default router;


